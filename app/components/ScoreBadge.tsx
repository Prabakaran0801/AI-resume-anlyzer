import React from "react";

interface ScoreBadgeProps {
  score: number;
}

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score }) => {
  let bgClass = "";
  let textClass = "";
  let label = "";

  if (score > 70) {
    bgClass = "bg-green-100";
    textClass = "text-green-600";
    label = "Strong";
  } else if (score > 49) {
    bgClass = "bg-yellow-100";
    textClass = "text-yellow-600";
    label = "Good Start";
  } else {
    bgClass = "bg-red-100";
    textClass = "text-red-600";
    label = "Needs Work";
  }

  return (
    <div className={`${bgClass} rounded px-2 py-1 inline-block`}>
      <p className={`${textClass} text-sm font-medium`}>{label}</p>
    </div>
  );
};

export default ScoreBadge;
