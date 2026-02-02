
import axios, { AxiosError } from "axios";

const BASE_URL = process.env.API_URL || "http://localhost:4000";

// Helper to handle Axios error printing
const printError = (msg: string, err: any) => {
  if (axios.isAxiosError(err)) {
    console.error(`[FAIL] ${msg}: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
  } else {
    console.error(`[FAIL] ${msg}:`, err);
  }
};

const assertStatus = (err: any, status: number) => {
  if (axios.isAxiosError(err) && err.response?.status === status) {
    console.log(`[PASS] Correctly received ${status}`);
    return true;
  }
  return false;
};

async function runVerification() {
  console.log("=== STARTING SECURITY VERIFICATION ===\n");

  try {
    // 1. Unauthorized Access
    console.log("1. Testing Unauthorized Access...");
    try {
      await axios.get(`${BASE_URL}/users/me`);
      console.error("[FAIL] /users/me should require auth");
    } catch (err) {
      assertStatus(err, 401);
    }

    try {
      await axios.get(`${BASE_URL}/groups/me`);
      console.error("[FAIL] /groups/me should require auth");
    } catch (err) {
      assertStatus(err, 401);
    }

    // 2. Setup Test Users
    console.log("\n2. Setting up Test Users...");
    const emailA = `test_hidden_${Date.now()}@example.com`;
    const emailB = `test_visible_${Date.now()}@example.com`;
    const password = "password123";

    // Create Hidden User (GROUPS_ONLY)
    console.log(`Creating hidden user: ${emailA}`);
    const regA = await axios.post(`${BASE_URL}/auth/register`, {
      email: emailA,
      password,
      name: "Hidden User",
      batch: "2025",
      branch: "CSE"
    });
    const tokenA = regA.data.token;

    // Set visibility to GROUPS_ONLY
    await axios.patch(`${BASE_URL}/users/leaderboard-visibility`, { visibility: "GROUPS_ONLY" }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    // Create Visible User (GLOBAL)
    console.log(`Creating visible user: ${emailB}`);
    const regB = await axios.post(`${BASE_URL}/auth/register`, {
      email: emailB,
      password,
      name: "Visible User",
      batch: "2025",
      branch: "CSE"
    });
    const tokenB = regB.data.token;
    // Default is GLOBAL_AND_GROUPS

    // 3. Verify Visibility Logic
    console.log("\n3. Verifying Visibility Logic...");

    // Check Global Leaderboard
    console.log("Checking Global Leaderboard...");
    const globalRes = await axios.get(`${BASE_URL}/leaderboard`);
    // Expected structure: map array
    const leaderboardData = Array.isArray(globalRes.data) ? globalRes.data : (globalRes.data.data || []);

    const hiddenUserFound = leaderboardData.find((u: any) => (u.user?.name === "Hidden User" || u.name === "Hidden User"));

    if (hiddenUserFound) {
      console.error("[FAIL] Hidden user found in global leaderboard!");
    } else {
      console.log("[PASS] Hidden user NOT found in global leaderboard.");
    }

    // Check Single User Lookup (Hidden)
    console.log("Checking Single User Lookup (Hidden)...");
    try {
      const meA = await axios.get(`${BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${tokenA}` } });
      const idA = meA.data.id;

      await axios.get(`${BASE_URL}/leaderboard/user/${idA}`);
      console.error("[FAIL] Should not be able to fetch hidden user leaderboard data");
    } catch (err) {
      if (assertStatus(err, 404)) {
        console.log("[PASS] Hidden user correctly returned 404 on public lookup.");
      } else {
        printError("Unexpected error on hidden lookup", err);
      }
    }

    // 4. Group Logic
    console.log("\n4. Verifying Group Logic...");

    // Create Group as User B
    const groupRes = await axios.post(`${BASE_URL}/groups`, { name: "Security Test Group" }, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const group = groupRes.data;
    const groupCode = group.code;
    console.log(`Created group ${group.id} with code ${groupCode}`);

    // Join Group as User A (Hidden)
    await axios.post(`${BASE_URL}/groups/join`, { code: groupCode }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log("Hidden user joined group.");

    // Check Group Leaderboard
    console.log("Checking Group Leaderboard...");
    const groupLbRes = await axios.get(`${BASE_URL}/groups/${group.id}/leaderboard`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const groupLbData = groupLbRes.data.data || [];
    const hiddenInGroup = groupLbData.find((u: any) => (u.user?.name === "Hidden User" || u.name === "Hidden User"));

    if (hiddenInGroup) {
      console.log("[PASS] Hidden user correctly found in GROUP leaderboard.");
    } else {
      console.error("[FAIL] Hidden user NOT found in group leaderboard!");
    }

    /* 
       NEW CHECK: Verify Members Endpoint returns an ARRAY
       This was the cause of the "members.map is not a function" error
    */
    console.log("Checking /members endpoint format...");
    const membersRes = await axios.get(`${BASE_URL}/groups/${group.id}/members`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    if (Array.isArray(membersRes.data)) {
      console.log("[PASS] /members endpoint returned an array.");
    } else {
      console.error("[FAIL] /members endpoint did NOT return an array! Got:", JSON.stringify(membersRes.data).substring(0, 100));
    }

    // 5. User Isolation
    console.log("\n5. Verifying User Isolation...");

    // User A tries to get members of group they are NOT in (create new group C for B)
    const splitGroupRes = await axios.post(`${BASE_URL}/groups`, { name: "Secret Group" }, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const splitGroupId = splitGroupRes.data.id;

    console.log(`User A (Non-member) trying to access Group ${splitGroupId} members...`);
    try {
      await axios.get(`${BASE_URL}/groups/${splitGroupId}/members`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      console.error("[FAIL] Non-member accessed group members!");
    } catch (err) {
      assertStatus(err, 403);
    }

    console.log("\n=== SECURITY VERIFICATION COMPLETE ===");

  } catch (err) {
    console.error("Verification script failed unexpectedly:", err);
  }
}

runVerification();
