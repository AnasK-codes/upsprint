import { Request , Response } from "express";
import bcrypt from "bcrypt"; 
import prisma from "../config/db.js";

export const register = async(req : Request , res : Response)=>{
 try{
  const {email ,password ,name ,batch ,branch } = req.body;
  if(!email || !password){
    return res.status(400).json({message : "Email and Password required"});
  }
  const existingUser = await prisma.user.findUnique({
    where : {email}
  });
  if(existingUser){
    return res.status(409).json({ message: "User already exists" });
  }
  const hashedPassword = await bcrypt.hash(password , 10);

  const user = await prisma.user.create({
    data:{
      email,
      password: hashedPassword,
      name,
      batch,
      branch
    },

  });
  res.status(201).json({message : "Internal Server Error"});

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};