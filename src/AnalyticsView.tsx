import React, { useMemo } from "react";
import { EvaluationRecord } from "./types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from "recharts";
import { Users, UserX, UserCheck, Activity } from "lucide-react";

interface Props {
  data: EvaluationRecord[];
}

export default function AnalyticsView({ data }: Props) {
  const [selectedInterviewer, setSelectedInterviewer] = React.useState("All");
  const [selectedMonth, setSelectedMonth] = React.useState("All");
  const [selectedSite, setSelectedSite] = React.useState("All");

  // Extract unique interviewers and months for filter dropdowns
  const availableInterviewers = useMemo(() => {
    const interviewers = new Set<string>();
    data.forEach((d) => {
      if (d.interviewerName) interviewers.add(d.interviewerName);
    });
    return Array.from(interviewers).sort();
  }, [data]);

  const availableSites = useMemo(() => {
    const sites = new Set<string>();
    data.forEach((d) => {
      if (d.candidateSite) sites.add(d.candidateSite);
    });
    return Array.from(sites).sort();
  }, [data]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    data.forEach((d) => {
      const date = new Date(d.date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.add(monthStr);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      if (
        selectedInterviewer !== "All" &&
        d.interviewerName !== selectedInterviewer
      )
        return false;
      if (selectedSite !== "All" && d.candidateSite !== selectedSite)
        return false;
      if (selectedMonth !== "All") {
        const date = new Date(d.date);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthStr !== selectedMonth) return false;
      }
      return true;
    });
  }, [data, selectedInterviewer, selectedMonth, selectedSite]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) return { total: 0, avgScore: 0, hired: 0, rejected: 0 };

    const avgScore = Math.round(
      filteredData.reduce(
        (acc, curr) => acc + (curr.scoreInfo?.total || 0),
        0,
      ) / total,
    );
    const hired = filteredData.filter((d) =>
      [
        "Strong hire",
        "Hire",
        "Possible hire, only if mindset and honesty are strong",
      ].includes(d.scoreInfo?.rec),
    ).length;
    const rejected = total - hired;

    return { total, avgScore, hired, rejected };
  }, [filteredData]);

  const dailyTrendData = useMemo(() => {
    // Group by YYYY-MM-DD
    const counts: Record<string, number> = {};
    filteredData.forEach((d) => {
      const dateStr = new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([date, count]) => ({ date, Candidates: count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredData]);

  const interviewerData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach((d) => {
      const name = d.interviewerName || "Unknown";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, Evaluations: count }))
      .sort((a, b) => b.Evaluations - a.Evaluations);
  }, [filteredData]);

  const [activeDecisionIndex, setActiveDecisionIndex] = React.useState<
    number | null
  >(null);
  const [activeRecIndex, setActiveRecIndex] = React.useState<number | null>(
    null,
  );
  const [hoveredAcceptedItem, setHoveredAcceptedItem] = React.useState<
    any | null
  >(null);
  const [hoveredRecommendedItem, setHoveredRecommendedItem] = React.useState<
    any | null
  >(null);
  const [hoveredRejectedItem, setHoveredRejectedItem] = React.useState<
    any | null
  >(null);

  const decisionData = useMemo(() => {
    let accepted = 0;
    let recommended = 0;
    let rejected = 0;

    filteredData.forEach((d) => {
      const rec = (d.scoreInfo?.rec || "").toLowerCase().trim();
      if (rec === "strong hire" || rec === "hire") {
        accepted++;
      } else if (
        rec.includes("possible hire") ||
        rec.includes("mindset and honesty")
      ) {
        recommended++;
      } else {
        rejected++;
      }
    });

    return [
      { name: "Accepted", value: accepted, color: "#10b981" }, // green/emerald
      { name: "Recommended", value: recommended, color: "#8b5cf6" }, // purple/violet
      { name: "Rejected", value: rejected, color: "#ef4444" }, // red
    ];
  }, [filteredData]);

  const recommendationData = useMemo(() => {
    let strongHire = 0;
    let hire = 0;
    let possibleHire = 0;
    let highRisk = 0;
    let doNotHire = 0;

    filteredData.forEach((d) => {
      const rec = (d.scoreInfo?.rec || "").toLowerCase().trim();
      if (rec === "strong hire") strongHire++;
      else if (rec === "hire") hire++;
      else if (
        rec.includes("possible hire") ||
        rec.includes("mindset and honesty")
      )
        possibleHire++;
      else if (rec.includes("high risk")) highRisk++;
      else if (rec.includes("do not hire")) doNotHire++;
    });

    return [
      { name: "Strong Hire", value: strongHire, color: "#10b981" },
      { name: "Hire", value: hire, color: "#2563eb" },
      { name: "Possible Hire", value: possibleHire, color: "#8b5cf6" },
      { name: "High Risk", value: highRisk, color: "#f97316" },
      { name: "Do Not Hire", value: doNotHire, color: "#dc2626" },
    ];
  }, [filteredData]);

  const acceptedRecData = useMemo(() => {
    let strongHire = 0;
    let hire = 0;
    filteredData.forEach((d) => {
      const rec = (d.scoreInfo?.rec || "").toLowerCase().trim();
      if (rec === "strong hire") strongHire++;
      else if (rec === "hire") hire++;
    });
    return [
      { name: "Strong Hire", value: strongHire, color: "#10b981" },
      { name: "Hire", value: hire, color: "#2563eb" },
    ];
  }, [filteredData]);

  const acceptedRecDataPie = useMemo(() => {
    return acceptedRecData.filter((item) => item.value > 0);
  }, [acceptedRecData]);

  const recommendedRecData = useMemo(() => {
    let possibleHire = 0;
    filteredData.forEach((d) => {
      const rec = (d.scoreInfo?.rec || "").toLowerCase().trim();
      if (
        rec.includes("possible hire") ||
        rec.includes("mindset and honesty")
      ) {
        possibleHire++;
      }
    });
    return [{ name: "Possible Hire", value: possibleHire, color: "#8b5cf6" }];
  }, [filteredData]);

  const recommendedRecDataPie = useMemo(() => {
    return recommendedRecData.filter((item) => item.value > 0);
  }, [recommendedRecData]);

  const rejectedRecData = useMemo(() => {
    let highRisk = 0;
    let doNotHire = 0;
    filteredData.forEach((d) => {
      const rec = (d.scoreInfo?.rec || "").toLowerCase().trim();
      if (rec.includes("high risk")) highRisk++;
      else if (rec.includes("do not hire")) doNotHire++;
    });
    return [
      { name: "High Risk", value: highRisk, color: "#f97316" },
      { name: "Do Not Hire", value: doNotHire, color: "#dc2626" },
    ];
  }, [filteredData]);

  const rejectedRecDataPie = useMemo(() => {
    return rejectedRecData.filter((item) => item.value > 0);
  }, [rejectedRecData]);

  const acceptedTotal = useMemo(
    () => acceptedRecData.reduce((sum, item) => sum + item.value, 0),
    [acceptedRecData],
  );
  const recommendedTotal = useMemo(
    () => recommendedRecData.reduce((sum, item) => sum + item.value, 0),
    [recommendedRecData],
  );
  const rejectedTotal = useMemo(
    () => rejectedRecData.reduce((sum, item) => sum + item.value, 0),
    [rejectedRecData],
  );

  const getRecColor = (recName: string) => {
    const name = recName.toLowerCase();
    if (name.includes("strong hire")) return "#10b981"; // Emerald Green
    if (name === "hire") return "#2563eb"; // Blue
    if (name.includes("possible hire") || name.includes("mindset and honesty"))
      return "#8b5cf6"; // Purple
    if (name.includes("high risk")) return "#f97316"; // Orange
    if (name.includes("do not hire")) return "#dc2626"; // Red
    return "#64748b"; // Slate gray fallback
  };

  const correlationData = useMemo(() => {
    const acceptedObj: any = {
      name: "Accepted",
      "Strong hire": 0,
      Hire: 0,
      "Possible hire, only if mindset and honesty are strong": 0,
      "High risk": 0,
      "Do not hire": 0,
      total: 0,
    };
    const recommendedObj: any = {
      name: "Recommended",
      "Strong hire": 0,
      Hire: 0,
      "Possible hire, only if mindset and honesty are strong": 0,
      "High risk": 0,
      "Do not hire": 0,
      total: 0,
    };
    const rejectedObj: any = {
      name: "Rejected",
      "Strong hire": 0,
      Hire: 0,
      "Possible hire, only if mindset and honesty are strong": 0,
      "High risk": 0,
      "Do not hire": 0,
      total: 0,
    };

    filteredData.forEach((d) => {
      const rec = d.scoreInfo?.rec || "Unknown";
      const recLower = rec.toLowerCase().trim();

      if (recLower === "strong hire" || recLower === "hire") {
        acceptedObj[rec] = (acceptedObj[rec] || 0) + 1;
        acceptedObj.total++;
      } else if (
        recLower.includes("possible hire") ||
        recLower.includes("mindset and honesty")
      ) {
        recommendedObj[rec] = (recommendedObj[rec] || 0) + 1;
        recommendedObj.total++;
      } else {
        rejectedObj[rec] = (rejectedObj[rec] || 0) + 1;
        rejectedObj.total++;
      }
    });

    return [acceptedObj, recommendedObj, rejectedObj];
  }, [filteredData]);

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    if (!value || value === 0) return null;

    const currentGroup = correlationData[index];
    const groupTotal = currentGroup ? currentGroup.total : 0;
    const percentage =
      groupTotal > 0 ? Math.round((value / groupTotal) * 100) : 0;

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    if (height < 24) {
      return (
        <text
          x={centerX}
          y={centerY}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[10px] font-extrabold"
        >
          {value} ({percentage}%)
        </text>
      );
    }

    return (
      <g>
        <text
          x={centerX}
          y={centerY - 3}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[11px] font-extrabold"
        >
          {value}
        </text>
        <text
          x={centerX}
          y={centerY + 7}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[9px] font-bold opacity-90"
        >
          {percentage}%
        </text>
      </g>
    );
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
    value,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 22;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percentage = (percent * 100).toFixed(0);

    return (
      <text
        x={x}
        y={y}
        fill="#475569"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-[10px] sm:text-[11px] font-bold text-slate-600"
      >
        {`${name}: ${value} (${percentage}%)`}
      </text>
    );
  };

  if (data.length === 0) {
    return (
      <div className="bg-white p-8 rounded border border-slate-200 text-center text-slate-500">
        No evaluation data available to analyze yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2">
          Filters:
        </span>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none text-sm"
          >
            <option value="All">All Time</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {new Date(m + "-02").toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">
            Interviewer:
          </label>
          <select
            value={selectedInterviewer}
            onChange={(e) => setSelectedInterviewer(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none text-sm"
          >
            <option value="All">All Interviewers</option>
            {availableInterviewers.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Site:</label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none text-sm"
          >
            <option value="All">All Sites</option>
            {availableSites.map((s) => (
              <option key={s} value={s}>
                {s === "Alex" ? "Alexandria" : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Total Candidates
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {stats.total}
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Avg. Score
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {stats.avgScore}{" "}
            <span className="text-sm font-medium text-slate-400">/ 100</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <UserCheck className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Passed (Any)
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {stats.hired}{" "}
            <span className="text-sm font-medium text-slate-400">
              (
              {stats.total > 0
                ? Math.round((stats.hired / stats.total) * 100)
                : 0}
              %)
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <UserX className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Failed
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {stats.rejected}{" "}
            <span className="text-sm font-medium text-slate-400">
              (
              {stats.total > 0
                ? Math.round((stats.rejected / stats.total) * 100)
                : 0}
              %)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-6">
            Evaluation Volume by Date
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dailyTrendData}
                margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorCandidates"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#442ea4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#442ea4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  dx={-10}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "0.25rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Candidates"
                  stroke="#442ea4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCandidates)"
                >
                  <LabelList
                    dataKey="Candidates"
                    position="top"
                    offset={10}
                    style={{ fontSize: 12, fontWeight: 700, fill: "#442ea4" }}
                  />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-6">
            Evaluations per Interviewer
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={interviewerData}
                layout="vertical"
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }}
                  dx={-10}
                />
                <RechartsTooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "0.25rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  }}
                />
                <Bar
                  dataKey="Evaluations"
                  fill="#288df7"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                >
                  <LabelList
                    dataKey="Evaluations"
                    position="right"
                    offset={8}
                    style={{ fontSize: 12, fontWeight: 700, fill: "#1e293b" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Decision Summary Card */}
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col h-[420px]">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Decision Summary
            </h3>
            <p className="text-xs text-slate-500">
              High-level outcome breakdown (Accepted vs. Recommended vs.
              Rejected)
            </p>
          </div>

          {stats.total === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
              No matching candidates for current filters
            </div>
          ) : (
            <div className="flex-1 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionData}
                    cx="50%"
                    cy="55%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    label={renderCustomLabel}
                    labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                    onMouseEnter={(_, idx) => setActiveDecisionIndex(idx)}
                    onMouseLeave={() => setActiveDecisionIndex(null)}
                  >
                    {decisionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="cursor-pointer transition-all duration-200 hover:opacity-90"
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "0.25rem",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                    }}
                    formatter={(value, name) => [`${value} Candidates`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    layout="horizontal"
                    wrapperStyle={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#475569",
                      paddingTop: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center overlay positioned precisely inside the donut hole */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[15px]">
                <span className="text-3xl font-black text-slate-900 leading-none">
                  {activeDecisionIndex !== null
                    ? decisionData[activeDecisionIndex].value
                    : stats.total}
                </span>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-center max-w-[100px] truncate mt-1">
                  {activeDecisionIndex !== null
                    ? decisionData[activeDecisionIndex].name
                    : "Total"}
                </span>
                <span
                  className="text-sm font-black mt-0.5 animate-pulse"
                  style={{
                    color:
                      activeDecisionIndex !== null
                        ? decisionData[activeDecisionIndex].color
                        : "#4f46e5",
                  }}
                >
                  {stats.total > 0
                    ? `${Math.round(((activeDecisionIndex !== null ? decisionData[activeDecisionIndex].value : stats.total) / stats.total) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recommendation Outcome Card */}
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col h-[420px]">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Recommendation Outcome
            </h3>
            <p className="text-xs text-slate-500">
              Overall candidate distribution across all 5 evaluation brackets
            </p>
          </div>

          {stats.total === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
              No matching candidates for current filters
            </div>
          ) : (
            <div className="flex-1 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={recommendationData}
                    cx="50%"
                    cy="55%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    label={renderCustomLabel}
                    labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                    onMouseEnter={(_, idx) => setActiveRecIndex(idx)}
                    onMouseLeave={() => setActiveRecIndex(null)}
                  >
                    {recommendationData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="cursor-pointer transition-all duration-200 hover:opacity-90"
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "0.25rem",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                    }}
                    formatter={(value, name) => [`${value} Candidates`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    layout="horizontal"
                    wrapperStyle={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#475569",
                      paddingTop: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center overlay positioned precisely inside the donut hole */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[15px]">
                <span className="text-3xl font-black text-slate-900 leading-none">
                  {activeRecIndex !== null
                    ? recommendationData[activeRecIndex].value
                    : stats.total}
                </span>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-center max-w-[100px] truncate mt-1">
                  {activeRecIndex !== null
                    ? recommendationData[activeRecIndex].name
                    : "Total"}
                </span>
                <span
                  className="text-sm font-black mt-0.5"
                  style={{
                    color:
                      activeRecIndex !== null
                        ? recommendationData[activeRecIndex].color
                        : "#4f46e5",
                  }}
                >
                  {stats.total > 0
                    ? `${Math.round(
                        ((activeRecIndex !== null
                          ? recommendationData[activeRecIndex].value
                          : stats.total) /
                          stats.total) *
                          100,
                      )}%`
                    : "0%"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Recommendation Breakdown Card */}
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 flex flex-col h-auto lg:col-span-2">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Detailed Recommendation Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Granular scorecard outcome breakdown across Accepted, Recommended,
              and Rejected categories side-by-side
            </p>
          </div>

          {stats.total === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium py-12">
              No matching candidates for current filters
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 mt-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* 1. Accepted Donuts */}
              <div className="flex flex-col items-center pt-4 md:pt-0">
                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest text-center mb-1">
                  Accepted ({acceptedTotal})
                </h4>
                <div className="relative w-full h-[180px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={acceptedRecDataPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, idx) =>
                          setHoveredAcceptedItem(acceptedRecDataPie[idx])
                        }
                        onMouseLeave={() => setHoveredAcceptedItem(null)}
                      >
                        {acceptedRecDataPie.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="cursor-pointer transition-all duration-200 hover:opacity-90"
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: "0.25rem",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                        }}
                        formatter={(value, name) => [
                          `${value} Candidates`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[10px]">
                    <span className="text-lg font-black text-slate-800 leading-none">
                      {hoveredAcceptedItem
                        ? hoveredAcceptedItem.value
                        : acceptedTotal}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider text-center max-w-[80px] truncate mt-0.5">
                      {hoveredAcceptedItem ? hoveredAcceptedItem.name : "Total"}
                    </span>
                    <span
                      className="text-xs font-bold mt-0.5"
                      style={{
                        color: hoveredAcceptedItem
                          ? hoveredAcceptedItem.color
                          : "#10b981",
                      }}
                    >
                      {acceptedTotal > 0
                        ? `${Math.round(
                            ((hoveredAcceptedItem
                              ? hoveredAcceptedItem.value
                              : acceptedTotal) /
                              acceptedTotal) *
                              100,
                          )}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
                {/* Custom list of items */}
                <div className="mt-2 w-full max-w-[200px] flex flex-col gap-1">
                  {acceptedRecData.map((entry) => {
                    const pct =
                      acceptedTotal > 0
                        ? Math.round((entry.value / acceptedTotal) * 100)
                        : 0;
                    const isHovered = hoveredAcceptedItem?.name === entry.name;
                    return (
                      <div
                        key={entry.name}
                        className={`flex items-center justify-between px-2 py-0.5 rounded transition-colors duration-150 ${
                          isHovered ? "bg-slate-50" : ""
                        }`}
                        onMouseEnter={() => setHoveredAcceptedItem(entry)}
                        onMouseLeave={() => setHoveredAcceptedItem(null)}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-[10px] font-black text-slate-600 truncate">
                            {entry.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-slate-900 shrink-0">
                          {entry.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Recommended Donuts */}
              <div className="flex flex-col items-center pt-4 md:pt-0 md:pl-4">
                <h4 className="text-xs font-black text-violet-600 uppercase tracking-widest text-center mb-1">
                  Recommended ({recommendedTotal})
                </h4>
                <div className="relative w-full h-[180px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={recommendedRecDataPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, idx) =>
                          setHoveredRecommendedItem(recommendedRecDataPie[idx])
                        }
                        onMouseLeave={() => setHoveredRecommendedItem(null)}
                      >
                        {recommendedRecDataPie.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="cursor-pointer transition-all duration-200 hover:opacity-90"
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: "0.25rem",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                        }}
                        formatter={(value, name) => [
                          `${value} Candidates`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[10px]">
                    <span className="text-lg font-black text-slate-800 leading-none">
                      {hoveredRecommendedItem
                        ? hoveredRecommendedItem.value
                        : recommendedTotal}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider text-center max-w-[80px] truncate mt-0.5">
                      {hoveredRecommendedItem
                        ? hoveredRecommendedItem.name
                        : "Total"}
                    </span>
                    <span
                      className="text-xs font-bold mt-0.5"
                      style={{
                        color: hoveredRecommendedItem
                          ? hoveredRecommendedItem.color
                          : "#8b5cf6",
                      }}
                    >
                      {recommendedTotal > 0
                        ? `${Math.round(
                            ((hoveredRecommendedItem
                              ? hoveredRecommendedItem.value
                              : recommendedTotal) /
                              recommendedTotal) *
                              100,
                          )}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
                {/* Custom list of items */}
                <div className="mt-2 w-full max-w-[200px] flex flex-col gap-1">
                  {recommendedRecData.map((entry) => {
                    const pct =
                      recommendedTotal > 0
                        ? Math.round((entry.value / recommendedTotal) * 100)
                        : 0;
                    const isHovered =
                      hoveredRecommendedItem?.name === entry.name;
                    return (
                      <div
                        key={entry.name}
                        className={`flex items-center justify-between px-2 py-0.5 rounded transition-colors duration-150 ${
                          isHovered ? "bg-slate-50" : ""
                        }`}
                        onMouseEnter={() => setHoveredRecommendedItem(entry)}
                        onMouseLeave={() => setHoveredRecommendedItem(null)}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-[10px] font-black text-slate-600 truncate">
                            {entry.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-slate-900 shrink-0">
                          {entry.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Rejected Donuts */}
              <div className="flex flex-col items-center pt-4 md:pt-0 md:pl-4">
                <h4 className="text-xs font-black text-red-600 uppercase tracking-widest text-center mb-1">
                  Rejected ({rejectedTotal})
                </h4>
                <div className="relative w-full h-[180px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rejectedRecDataPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, idx) =>
                          setHoveredRejectedItem(rejectedRecDataPie[idx])
                        }
                        onMouseLeave={() => setHoveredRejectedItem(null)}
                      >
                        {rejectedRecDataPie.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="cursor-pointer transition-all duration-200 hover:opacity-90"
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: "0.25rem",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                        }}
                        formatter={(value, name) => [
                          `${value} Candidates`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[10px]">
                    <span className="text-lg font-black text-slate-800 leading-none">
                      {hoveredRejectedItem
                        ? hoveredRejectedItem.value
                        : rejectedTotal}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider text-center max-w-[80px] truncate mt-0.5">
                      {hoveredRejectedItem ? hoveredRejectedItem.name : "Total"}
                    </span>
                    <span
                      className="text-xs font-bold mt-0.5"
                      style={{
                        color: hoveredRejectedItem
                          ? hoveredRejectedItem.color
                          : "#ef4444",
                      }}
                    >
                      {rejectedTotal > 0
                        ? `${Math.round(
                            ((hoveredRejectedItem
                              ? hoveredRejectedItem.value
                              : rejectedTotal) /
                              rejectedTotal) *
                              100,
                          )}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
                {/* Custom list of items */}
                <div className="mt-2 w-full max-w-[200px] flex flex-col gap-1">
                  {rejectedRecData.map((entry) => {
                    const pct =
                      rejectedTotal > 0
                        ? Math.round((entry.value / rejectedTotal) * 100)
                        : 0;
                    const isHovered = hoveredRejectedItem?.name === entry.name;
                    return (
                      <div
                        key={entry.name}
                        className={`flex items-center justify-between px-2 py-0.5 rounded transition-colors duration-150 ${
                          isHovered ? "bg-slate-50" : ""
                        }`}
                        onMouseEnter={() => setHoveredRejectedItem(entry)}
                        onMouseLeave={() => setHoveredRejectedItem(null)}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-[10px] font-black text-slate-600 truncate">
                            {entry.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-slate-900 shrink-0">
                          {entry.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
