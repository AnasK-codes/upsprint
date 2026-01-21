import { motion } from "framer-motion";
import { TrendingUp, Award, Zap, GitCommit, CheckCircle } from "lucide-react";

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
        return <TrendingUp className="w-5 h-5 text-indigo-500" />;
      case "badge_unlock":
        return <Award className="w-5 h-5 text-amber-500" />;
      case "streak_milestone":
        return <Zap className="w-5 h-5 text-purple-500" />;
      case "solve":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <GitCommit className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBgColor = (type: Activity["type"]) => {
    switch (type) {
      case "rank_up":
        return "bg-indigo-50 border-indigo-100";
      case "badge_unlock":
        return "bg-amber-50 border-amber-100";
      case "streak_milestone":
        return "bg-purple-50 border-purple-100";
      case "solve":
        return "bg-green-50 border-green-100";
      default:
        return "bg-gray-50 border-gray-100";
    }
  };

  return (
    <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 py-2">
      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className="relative pl-8"
        >
          {/* Timeline Dot */}
          <div
            className={`absolute -left-[11px] w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${getBgColor(activity.type)}`}
          >
            <div className="w-2 h-2 rounded-full bg-current opacity-50" />
          </div>

          {/* Card */}
          <motion.div
            whileHover={{ scale: 1.01, x: 4 }}
            className={`p-4 rounded-xl border shadow-sm flex items-start gap-4 transition-colors ${getBgColor(activity.type)} bg-opacity-40 backdrop-blur-sm`}
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {getIcon(activity.type)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">
                {activity.title}
              </h4>
              <p className="text-sm text-gray-500 mt-0.5">
                {activity.description}
              </p>
              <div className="text-xs text-gray-400 mt-2 font-medium">
                {new Date(activity.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
