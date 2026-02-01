import { motion } from "framer-motion";
import { TrendingUp, Zap, GitCommit, CheckCircle } from "lucide-react";

export interface Activity {
  id: string;
  type:
    | "rank_up"
    | "badge_unlock"
    | "streak_milestone"
    | "solve"
    | "connection";
  title: string;
  description: string;
  date: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export default function ActivityTimeline({
  activities,
}: ActivityTimelineProps) {
  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "rank_up":
        return <TrendingUp className="w-5 h-5 text-emerald-500" />;

      case "streak_milestone":
        return <Zap className="w-5 h-5 text-cyan-500" />;
      case "solve":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <GitCommit className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBgColor = (type: Activity["type"]) => {
    switch (type) {
      case "rank_up":
        return "bg-emerald-50 border-emerald-100";

      case "streak_milestone":
        return "bg-cyan-50 border-cyan-100";
      case "solve":
        return "bg-green-50 border-green-100";
      default:
        return "bg-gray-50 border-gray-100";
    }
  };

  return (
    <div className="relative pl-4 py-2 space-y-6">
      {/* Connector Line */}
      <div className="absolute top-4 bottom-4 left-[23px] w-[2px] bg-slate-100" />

      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="relative group pl-8"
        >
          {/* Timeline Dot */}
          <div
            className={`absolute left-[14px] top-4 w-5 h-5 rounded-full border-[3px] border-white shadow-sm z-10 box-content ${
              activity.type === "rank_up"
                ? "bg-emerald-500"
                : activity.type === "streak_milestone"
                  ? "bg-cyan-500"
                  : "bg-indigo-500"
            }`}
          />

          {/* Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group-hover:translate-x-1">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  {activity.title}
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {activity.description}
                </p>
              </div>
              <div className="text-xs font-mono font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg whitespace-nowrap">
                {new Date(activity.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
