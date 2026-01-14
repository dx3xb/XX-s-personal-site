/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState } from "react";
import {
  Plane,
  Hotel,
  MapPin,
  Utensils,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Train,
  Coffee,
  ChevronDown,
  ChevronUp,
  Wallet,
  Edit3,
  Eye,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Image as ImageIcon,
  Save,
} from "lucide-react";

type ActivityType = "food" | "transport" | "hotel" | "sight" | "train" | "other";

type Activity = {
  id: number;
  time: string;
  type: ActivityType;
  title: string;
  desc: string;
  link: string;
  image: string;
};

type DayPlan = {
  id: number;
  date: string;
  title: string;
  weather: string;
  note: string;
  activities: Activity[];
};

type DayField = "date" | "title" | "weather" | "note";
type ActivityField = "time" | "type" | "title" | "desc" | "link" | "image";

const TripPlanner = () => {
  const [activeTab, setActiveTab] = useState("itinerary");
  const [expandedDay, setExpandedDay] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  const [tripInfo, setTripInfo] = useState({
    title: "老北京国际大都市轻松休闲放松之旅",
    dateRange: "2025.04.28 - 05.02",
    route: "广州 ✈️ 北京",
    duration: "5 天 4 晚",
    theme: "休闲放松 + 胡同文化",
    tag: "五一假期",
  });

  const [itinerary, setItinerary] = useState<DayPlan[]>([
    {
      id: 1,
      date: "4月28日 (周一)",
      title: "抵达北京 - 璞瑄与胡同漫步",
      weather: "晴 18°C-26°C",
      note: "入住绝版地段璞瑄酒店，开启胡同探索。",
      activities: [
        {
          id: 101,
          time: "09:00 - 12:00",
          type: "transport",
          title: "广州 ✈️ 北京",
          desc: "上午9点左右的航班，预计中午12点抵达北京。",
          link: "",
          image: "",
        },
        {
          id: 102,
          time: "13:00 - 14:30",
          type: "hotel",
          title: "入住北京璞瑄酒店 & 午餐",
          desc: "抵达王府井大街1号的璞瑄酒店办理入住。推荐在酒店内的 Rive Gauche 餐厅享用简餐，开启法式浪漫。",
          link: "https://thepuxuan.com/",
          image:
            "https://cf.bstatic.com/xdata/images/hotel/max1024x768/185848529.jpg?k=23126839352763261536783935276326153678",
        },
        {
          id: 103,
          time: "15:30 - 16:00",
          type: "sight",
          title: "漫步东四胡同区",
          desc: "从酒店步行出发，穿越东四胡同区域。这里保留了很好的老北京韵味，探访艺术馆、特色咖啡馆，感受最地道的“北京味”。",
          link: "",
          image: "",
        },
        {
          id: 104,
          time: "16:00 - 17:30",
          type: "sight",
          title: "景山公园 (登山/观景)",
          desc: "从东四十条步行至景山公园。登上万春亭俯瞰紫禁城全貌，拍摄绝美大片，感受皇家园林的宁静气氛。",
          link: "",
          image:
            "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&q=80&w=800",
        },
        {
          id: 105,
          time: "17:30 - 19:00",
          type: "food",
          title: "晚餐：TRB Hutong",
          desc: "从景山步行前往 TRB Hutong。这是一家位于古老胡同中的高端现代欧式餐厅，环境优雅，是体验地道胡同文化与美食结合的绝佳之地。",
          link: "http://www.trb-hutong.com/",
          image: "",
        },
        {
          id: 106,
          time: "19:00",
          type: "hotel",
          title: "返回璞瑄酒店",
          desc: "晚餐结束后，散步或打车回酒店休息，享受酒店的 UR SPA 或欣赏窗外的夜景。",
          link: "",
          image: "",
        },
      ],
    },
    {
      id: 2,
      date: "4月29日 (周二)",
      title: "中轴线巡礼 - 皇城威严",
      weather: "多云 19°C-27°C",
      note: "",
      activities: [
        {
          id: 201,
          time: "05:00 - 07:00",
          type: "sight",
          title: "天安门升旗 (可选)",
          desc: "需提前预约。若体力允许可去，否则建议睡饱直接去故宫。",
          link: "https://www.tiananmen.org.cn/",
          image: "",
        },
        {
          id: 202,
          time: "08:30 - 13:30",
          type: "sight",
          title: "故宫博物院 (紫禁城)",
          desc: "必争之地！需提前7天20:00抢票。路线：午门入 -> 三大殿 -> 御花园 -> 神武门出。",
          link: "https://www.dpm.org.cn/",
          image: "",
        },
        {
          id: 203,
          time: "14:00 - 15:30",
          type: "food",
          title: "午餐：老北京炸酱面",
          desc: "推荐：方砖厂69号炸酱面（由于是网红店可能排队），或附近胡同小馆。",
          link: "",
          image: "",
        },
        {
          id: 204,
          time: "16:00 - 18:00",
          type: "sight",
          title: "北海公园",
          desc: "让我们荡起双桨~ 游览白塔，体验皇家园林的静谧。",
          link: "",
          image: "",
        },
      ],
    },
    {
      id: 3,
      date: "4月30日 (周三)",
      title: "不到长城非好汉",
      weather: "晴 15°C-25°C",
      note: "",
      activities: [
        {
          id: 301,
          time: "07:30 - 09:30",
          type: "transport",
          title: "前往慕田峪长城",
          desc: "相比八达岭人更少。建议包车或乘坐'慕巴士'直通车。",
          link: "",
          image: "",
        },
        {
          id: 302,
          time: "10:00 - 14:00",
          type: "sight",
          title: "登长城",
          desc: "建议索道上，滑道下（非常刺激）。自备干粮和水。",
          link: "",
          image:
            "https://images.unsplash.com/photo-1508804052814-cd3ba865a116?auto=format&fit=crop&q=80&w=800",
        },
        {
          id: 303,
          time: "16:30 - 18:30",
          type: "sight",
          title: "鸟巢 & 水立方",
          desc: "回市区后，前往奥林匹克公园看夜景外观，无需买票入内。",
          link: "",
          image: "",
        },
        {
          id: 304,
          time: "19:00 - 20:30",
          type: "food",
          title: "晚餐：铜锅涮肉",
          desc: "推荐：南门涮肉或聚宝源。体验地道麻酱与羊肉的快乐。",
          link: "",
          image: "",
        },
      ],
    },
    {
      id: 4,
      date: "5月1日 (周四/劳动节)",
      title: "祈福与皇家园林 - 避开人流",
      weather: "多云 20°C-29°C",
      note: "今日为假期第一天，人流量极大，请早起！",
      activities: [
        {
          id: 401,
          time: "08:00 - 11:00",
          type: "sight",
          title: "天坛公园",
          desc: "建议购买联票。必看：祈年殿、回音壁。感受古树参天。",
          link: "",
          image: "",
        },
        {
          id: 402,
          time: "12:00 - 13:30",
          type: "food",
          title: "午餐：门钉肉饼/爆肚",
          desc: "天坛附近有很多老字号小吃，尝试尹三豆汁（慎重）或锦芳小吃。",
          link: "",
          image: "",
        },
        {
          id: 403,
          time: "14:30 - 17:30",
          type: "sight",
          title: "颐和园",
          desc: "中国最大的皇家园林。建议西宫门入，走长廊，看佛香阁。",
          link: "",
          image:
            "https://images.unsplash.com/photo-1543085203-34676a086057?auto=format&fit=crop&q=80&w=800",
        },
        {
          id: 404,
          time: "19:00 - 21:00",
          type: "sight",
          title: "三里屯 / 蓝色港湾",
          desc: "晚上感受北京的时尚一面，顺便解决晚餐。",
          link: "",
          image: "",
        },
      ],
    },
    {
      id: 5,
      date: "5月2日 (周五)",
      title: "胡同漫游 & 返程",
      weather: "晴 20°C-28°C",
      note: "",
      activities: [
        {
          id: 501,
          time: "09:00 - 11:30",
          type: "sight",
          title: "什刹海 & 南锣鼓巷",
          desc: "逛逛胡同，看看后海，买点伴手礼（稻香村糕点）。",
          link: "",
          image: "",
        },
        {
          id: 502,
          time: "12:00 - 13:30",
          type: "food",
          title: "最后的午餐",
          desc: "推荐：局气或京味斋，环境好，菜品全。",
          link: "",
          image: "",
        },
        {
          id: 503,
          time: "14:30",
          type: "transport",
          title: "前往机场",
          desc: "预留充足时间前往机场。5月2日下午15点左右的航班，建议提前3小时出发。",
          link: "",
          image: "",
        },
        {
          id: 504,
          time: "18:00",
          type: "transport",
          title: "抵达广州",
          desc: "约18点左右回到温暖的家。",
          link: "",
          image: "",
        },
      ],
    },
  ]);

  const [tipsData, setTipsData] = useState({
    warnings: [
      "故宫门票：必须提前7天晚上8点抢票（例如4/22抢4/29的票）。秒没，建议设闹钟或找代理。",
      "人流：5月1日和2日是人流高峰，热门景点（长城、故宫）建议早上7点前到达。",
      "安检：北京安检严格且耗时，所有行程请预留额外30-60分钟安检时间。",
    ],
    checklist: [
      "身份证 (随身携带，随时刷证)",
      "学生证/老人证 (部分景点优惠)",
      "舒适的运动鞋 (每天2万步起)",
      "防晒霜/墨镜 (北京紫外线强)",
      "薄外套 (昼夜温差大)",
      "充电宝 (非常重要)",
    ],
    foods: [
      "北京烤鸭",
      "铜锅涮肉",
      "老北京炸酱面",
      "豆汁儿(挑战)",
      "炒肝",
      "卤煮火烧",
      "门钉肉饼",
      "驴打滚",
    ],
  });

  const [budgetData, setBudgetData] = useState({
    flight: "¥2000 - ¥3000",
    hotel: "¥3000+/晚",
    food: "¥1500",
    tickets: "¥500",
  });

  const getIcon = (type: ActivityType) => {
    switch (type) {
      case "food":
        return <Utensils className="w-4 h-4" />;
      case "transport":
        return <Plane className="w-4 h-4" />;
      case "hotel":
        return <Hotel className="w-4 h-4" />;
      case "sight":
        return <Camera className="w-4 h-4" />;
      case "train":
        return <Train className="w-4 h-4" />;
      default:
        return <Coffee className="w-4 h-4" />;
    }
  };

  const EditableText = ({
    value,
    onChange,
    className,
    multiline = false,
    placeholder = "",
  }: {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    multiline?: boolean;
    placeholder?: string;
  }) => {
    if (!isEditing) return <span className={className}>{value}</span>;
    return multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border border-blue-300 rounded p-1 bg-white focus:ring-2 focus:ring-blue-200 outline-none ${className}`}
        placeholder={placeholder}
      />
    ) : (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border border-blue-300 rounded p-1 bg-white focus:ring-2 focus:ring-blue-200 outline-none ${className}`}
        placeholder={placeholder}
      />
    );
  };

  const handleItineraryChange = (
    dayIndex: number,
    field: DayField,
    value: string
  ) => {
    const newItinerary = [...itinerary];
    newItinerary[dayIndex][field] = value;
    setItinerary(newItinerary);
  };

  const handleActivityChange = <K extends ActivityField>(
    dayIndex: number,
    actIndex: number,
    field: K,
    value: Activity[K]
  ) => {
    const newItinerary = [...itinerary];
    const activity = newItinerary[dayIndex].activities[actIndex];
    activity[field] = value;
    setItinerary(newItinerary);
  };

  const addActivity = (dayIndex: number) => {
    const newItinerary = [...itinerary];
    newItinerary[dayIndex].activities.push({
      id: Date.now(),
      time: "10:00",
      type: "sight",
      title: "新活动",
      desc: "活动描述...",
      link: "",
      image: "",
    });
    setItinerary(newItinerary);
  };

  const deleteActivity = (dayIndex: number, actIndex: number) => {
    const newItinerary = [...itinerary];
    newItinerary[dayIndex].activities.splice(actIndex, 1);
    setItinerary(newItinerary);
  };

  const moveActivity = (
    dayIndex: number,
    actIndex: number,
    direction: "up" | "down"
  ) => {
    const newItinerary = [...itinerary];
    const activities = newItinerary[dayIndex].activities;
    if (direction === "up" && actIndex > 0) {
      [activities[actIndex], activities[actIndex - 1]] = [
        activities[actIndex - 1],
        activities[actIndex],
      ];
    } else if (direction === "down" && actIndex < activities.length - 1) {
      [activities[actIndex], activities[actIndex + 1]] = [
        activities[actIndex + 1],
        activities[actIndex],
      ];
    }
    setItinerary(newItinerary);
  };

  const addDay = () => {
    setItinerary([
      ...itinerary,
      {
        id: Date.now(),
        date: "新日期",
        title: "新的一天",
        weather: "晴",
        note: "",
        activities: [],
      },
    ]);
  };

  const deleteDay = (dayIndex: number) => {
    if (confirm("确定要删除这一整天的行程吗？")) {
      const newItinerary = [...itinerary];
      newItinerary.splice(dayIndex, 1);
      setItinerary(newItinerary);
    }
  };

  const handleTipsChange = (
    category: "warnings" | "checklist" | "foods",
    index: number,
    value: string
  ) => {
    const newTips = { ...tipsData };
    newTips[category][index] = value;
    setTipsData(newTips);
  };

  const addTip = (category: "warnings" | "checklist" | "foods") => {
    const newTips = { ...tipsData };
    newTips[category].push("新条目");
    setTipsData(newTips);
  };

  const deleteTip = (category: "warnings" | "checklist" | "foods", index: number) => {
    const newTips = { ...tipsData };
    newTips[category].splice(index, 1);
    setTipsData(newTips);
  };

  const renderItinerary = () => (
    <div className="space-y-4">
      {itinerary.map((item, index) => (
        <div
          key={item.id}
          className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div
            className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-colors ${
              expandedDay === index ? "bg-red-50" : "bg-white"
            }`}
          >
            <div
              className="flex items-center gap-3 w-full cursor-pointer"
              onClick={() => !isEditing && setExpandedDay(expandedDay === index ? -1 : index)}
            >
              <div
                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-white ${
                  expandedDay === index ? "bg-red-600" : "bg-slate-400"
                }`}
              >
                D{index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <EditableText
                    value={item.date}
                    onChange={(v) => handleItineraryChange(index, "date", v)}
                    className="font-bold"
                  />
                </div>
                <div className="text-sm text-slate-500">
                  <EditableText
                    value={item.title}
                    onChange={(v) => handleItineraryChange(index, "title", v)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <input
                    value={item.weather}
                    onChange={(e) =>
                      handleItineraryChange(index, "weather", e.target.value)
                    }
                    className="text-xs px-2 py-1 border border-blue-300 rounded w-24"
                    placeholder="天气"
                  />
                ) : (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {item.weather}
                  </span>
                )}

                {isEditing && (
                  <button
                    onClick={() => deleteDay(index)}
                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setExpandedDay(expandedDay === index ? -1 : index)}
                className="p-1"
              >
                {expandedDay === index ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {(expandedDay === index || isEditing) && (
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              {isEditing ? (
                <div className="mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    特别备注
                  </span>
                  <EditableText
                    value={item.note}
                    onChange={(v) => handleItineraryChange(index, "note", v)}
                    placeholder="例如：今日人多，需早起..."
                    multiline
                    className="w-full text-sm mt-1"
                  />
                </div>
              ) : (
                item.note && (
                  <div className="mb-4 p-3 bg-orange-100 text-orange-800 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {item.note}
                  </div>
                )
              )}

              <div className="relative pl-0 sm:pl-6 border-l-0 sm:border-l-2 border-slate-300 space-y-6 sm:space-y-8">
                {item.activities.map((act, actIndex) => (
                  <div key={act.id} className="relative group pl-8 sm:pl-0">
                    <div
                      className={`absolute left-0 sm:-left-[31px] top-0 sm:top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 sm:border-4 border-slate-50 flex items-center justify-center z-10 ${
                        act.type === "food"
                          ? "bg-orange-500"
                          : act.type === "transport"
                          ? "bg-blue-500"
                          : act.type === "hotel"
                          ? "bg-purple-500"
                          : "bg-red-600"
                      } text-white shadow-sm`}
                    >
                      {getIcon(act.type)}
                    </div>

                    <div className="bg-white sm:bg-transparent p-3 sm:p-0 rounded-lg shadow-sm sm:shadow-none border sm:border-0 border-slate-200">
                      {isEditing && (
                        <div className="flex gap-2 mb-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                          <select
                            value={act.type}
                            onChange={(e) =>
                              handleActivityChange(
                                index,
                                actIndex,
                                "type",
                                e.target.value as ActivityType
                              )
                            }
                            className="text-xs p-1 rounded border border-slate-300"
                          >
                            <option value="sight">景点</option>
                            <option value="food">美食</option>
                            <option value="transport">交通</option>
                            <option value="hotel">住宿</option>
                            <option value="other">其他</option>
                          </select>
                          <div className="flex-1" />
                          <button
                            onClick={() => moveActivity(index, actIndex, "up")}
                            disabled={actIndex === 0}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveActivity(index, actIndex, "down")}
                            disabled={actIndex === item.activities.length - 1}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteActivity(index, actIndex)}
                            className="p-1 text-red-500 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">
                          <EditableText
                            value={act.time}
                            onChange={(v) => handleActivityChange(index, actIndex, "time", v)}
                            className="w-24"
                          />
                        </span>

                        <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                          <EditableText
                            value={act.title}
                            onChange={(v) => handleActivityChange(index, actIndex, "title", v)}
                            className="text-lg"
                          />
                          {!isEditing && act.link && (
                            <a
                              href={act.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </h4>

                        <div className="text-sm text-slate-600 leading-relaxed mb-2">
                          <EditableText
                            value={act.desc}
                            onChange={(v) => handleActivityChange(index, actIndex, "desc", v)}
                            multiline
                            className="w-full"
                          />
                        </div>

                        {isEditing && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                              <input
                                placeholder="添加链接 URL..."
                                value={act.link || ""}
                                onChange={(e) =>
                                  handleActivityChange(index, actIndex, "link", e.target.value)
                                }
                                className="text-xs w-full border-b border-slate-200 focus:border-blue-500 outline-none py-1 bg-transparent"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-3 h-3 text-slate-400" />
                              <input
                                placeholder="添加图片 URL..."
                                value={act.image || ""}
                                onChange={(e) =>
                                  handleActivityChange(index, actIndex, "image", e.target.value)
                                }
                                className="text-xs w-full border-b border-slate-200 focus:border-blue-500 outline-none py-1 bg-transparent"
                              />
                            </div>
                          </div>
                        )}

                        {act.image && (
                          <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-200">
                            <img
                              src={act.image}
                              alt={act.title}
                              className="w-full h-40 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            {isEditing && (
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                图片预览
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isEditing && (
                  <button
                    onClick={() => addActivity(index)}
                    className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 添加活动
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {isEditing && (
        <button
          onClick={addDay}
          className="w-full py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-red-500 hover:text-red-500 flex items-center justify-center gap-2 font-bold transition-all"
        >
          <Plus className="w-5 h-5" /> 添加新的一天行程
        </button>
      )}
    </div>
  );

  const renderInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4 text-blue-600">
          <Plane className="w-5 h-5" />
          <h3 className="font-bold text-lg">大交通</h3>
        </div>
        <div className="space-y-4">
          {isEditing ? (
            <textarea
              className="w-full h-32 p-2 border border-blue-200 rounded text-sm"
              placeholder="输入交通建议..."
              defaultValue="去程：4月28日上午9点左右出发。返程：5月2日下午15点左右起飞。"
            />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <div className="text-xl font-bold">CAN</div>
                  <div className="text-xs text-slate-500">广州白云</div>
                </div>
                <div className="flex-1 px-4 text-center">
                  <div className="text-xs text-slate-400">约 3h 15m</div>
                  <div className="h-px bg-slate-300 w-full relative">
                    <Plane className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 transform rotate-90" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">PKX/PEK</div>
                  <div className="text-xs text-slate-500">北京</div>
                </div>
              </div>
              <div className="text-sm text-slate-600 space-y-2">
                <p>
                  • <strong>去程：</strong> 4月28日 上午9:00航班 (约12:00抵达)。
                </p>
                <p>
                  • <strong>返程：</strong> 5月2日 下午15:00航班 (约18:00抵达)。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4 text-purple-600">
          <Hotel className="w-5 h-5" />
          <h3 className="font-bold text-lg">住宿：北京璞瑄酒店</h3>
        </div>
        {isEditing ? (
          <textarea
            className="w-full h-32 p-2 border border-purple-200 rounded text-sm"
            placeholder="输入住宿建议..."
            defaultValue="北京璞瑄酒店 The PuXuan Hotel and Spa..."
          />
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <h4 className="font-bold text-purple-900 text-sm">📍 王府井大街1号 (近故宫)</h4>
              <p className="text-xs text-purple-700 mt-1">
                绝版地段，5星级奢华酒店。设计由知名团队操刀，融合现代极简与传统元素。客房可直接远眺故宫景观。
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• <strong>特色：</strong> UR SPA, 现代东方设计</li>
                <li>• <strong>餐饮：</strong> Rive Gauche (法式小酒馆), 富春居 (粤菜)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 md:col-span-2">
        <div className="flex items-center gap-2 mb-4 text-green-600">
          <Wallet className="w-5 h-5" />
          <h3 className="font-bold text-lg">预算预估 (单人)</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <div className="text-xs text-slate-500 mb-1">机票 (往返)</div>
            <EditableText
              value={budgetData.flight}
              onChange={(v) => setBudgetData({ ...budgetData, flight: v })}
              className="font-bold text-slate-800 block w-full text-center"
            />
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <div className="text-xs text-slate-500 mb-1">住宿 (璞瑄)</div>
            <EditableText
              value={budgetData.hotel}
              onChange={(v) => setBudgetData({ ...budgetData, hotel: v })}
              className="font-bold text-slate-800 block w-full text-center"
            />
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <div className="text-xs text-slate-500 mb-1">餐饮</div>
            <EditableText
              value={budgetData.food}
              onChange={(v) => setBudgetData({ ...budgetData, food: v })}
              className="font-bold text-slate-800 block w-full text-center"
            />
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <div className="text-xs text-slate-500 mb-1">门票/交通</div>
            <EditableText
              value={budgetData.tickets}
              onChange={(v) => setBudgetData({ ...budgetData, tickets: v })}
              className="font-bold text-slate-800 block w-full text-center"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderTips = () => (
    <div className="space-y-4">
      <div className="bg-red-50 p-6 rounded-xl border border-red-100">
        <h3 className="flex items-center gap-2 font-bold text-red-800 mb-3">
          <AlertTriangle className="w-5 h-5" />
          特别预警
        </h3>
        <ul className="space-y-2 text-sm text-red-700">
          {tipsData.warnings.map((tip, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
              {isEditing ? (
                <div className="flex-1 flex gap-2">
                  <input
                    value={tip}
                    onChange={(e) => handleTipsChange("warnings", i, e.target.value)}
                    className="w-full bg-white/50 border-b border-red-200 px-1"
                  />
                  <button onClick={() => deleteTip("warnings", i)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ) : (
                <span>{tip}</span>
              )}
            </li>
          ))}
          {isEditing && (
            <button
              onClick={() => addTip("warnings")}
              className="text-xs text-red-500 border border-red-300 px-2 py-1 rounded hover:bg-red-100 mt-2"
            >
              + 添加预警
            </button>
          )}
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          行前准备清单
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
          {tipsData.checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <input type="checkbox" className="rounded text-blue-600" />
              {isEditing ? (
                <div className="flex-1 flex gap-2">
                  <input
                    value={item}
                    onChange={(e) => handleTipsChange("checklist", i, e.target.value)}
                    className="w-full bg-slate-50 border-b border-slate-200 px-1"
                  />
                  <button onClick={() => deleteTip("checklist", i)}>
                    <Trash2 className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ) : (
                <span>{item}</span>
              )}
            </div>
          ))}
          {isEditing && (
            <button
              onClick={() => addTip("checklist")}
              className="text-xs text-blue-500 border border-blue-300 px-2 py-1 rounded hover:bg-blue-50 w-fit"
            >
              + 添加清单项
            </button>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
        <h3 className="flex items-center gap-2 font-bold text-blue-800 mb-3">
          <Utensils className="w-5 h-5" />
          必吃美食Checklist
        </h3>
        <div className="flex flex-wrap gap-2">
          {tipsData.foods.map((food, i) => (
            <div key={i} className="relative group">
              {isEditing ? (
                <div className="flex items-center bg-white rounded-full border border-blue-200 pl-3 pr-1 py-1">
                  <input
                    value={food}
                    onChange={(e) => handleTipsChange("foods", i, e.target.value)}
                    className="w-24 text-xs outline-none text-blue-600"
                  />
                  <button
                    onClick={() => deleteTip("foods", i)}
                    className="p-1 hover:bg-red-50 rounded-full text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="px-3 py-1 bg-white text-blue-600 rounded-full text-xs font-medium border border-blue-100 shadow-sm">
                  {food}
                </span>
              )}
            </div>
          ))}
          {isEditing && (
            <button
              onClick={() => addTip("foods")}
              className="px-3 py-1 bg-blue-200 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-300"
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-slate-100 font-sans pb-10">
        <header className="bg-gradient-to-r from-red-700 to-red-900 text-white pb-16 pt-8 px-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
            <svg width="200" height="200" viewBox="0 0 100 100" fill="white">
              <rect x="0" y="0" width="100" height="100" />
            </svg>
          </div>

          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all ${
                isEditing
                  ? "bg-yellow-400 text-yellow-900"
                  : "bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
              }`}
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4" /> 预览模式
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" /> 编辑模式
                </>
              )}
            </button>
          </div>

          <div className="max-w-3xl mx-auto relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="w-full">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  <EditableText
                    value={tripInfo.title}
                    onChange={(v) => setTripInfo({ ...tripInfo, title: v })}
                    className="bg-transparent border-white/30 text-white focus:text-slate-800"
                  />
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-red-100 text-sm md:text-base">
                  <Calendar className="w-4 h-4" />
                  <EditableText
                    value={tripInfo.dateRange}
                    onChange={(v) => setTripInfo({ ...tripInfo, dateRange: v })}
                    className="bg-transparent border-white/30 text-white focus:text-slate-800 w-32"
                  />
                  <span className="mx-2 hidden sm:inline">|</span>
                  <MapPin className="w-4 h-4" />
                  <EditableText
                    value={tripInfo.route}
                    onChange={(v) => setTripInfo({ ...tripInfo, route: v })}
                    className="bg-transparent border-white/30 text-white focus:text-slate-800 w-32"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs md:text-sm text-red-200 mt-4">
              <div className="bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <EditableText
                  value={tripInfo.duration}
                  onChange={(v) => setTripInfo({ ...tripInfo, duration: v })}
                  className="bg-transparent text-center border-white/30 text-white focus:text-slate-800 w-16"
                />
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <EditableText
                  value={tripInfo.theme}
                  onChange={(v) => setTripInfo({ ...tripInfo, theme: v })}
                  className="bg-transparent text-center border-white/30 text-white focus:text-slate-800 w-32"
                />
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-300" />
                <EditableText
                  value={tripInfo.tag}
                  onChange={(v) => setTripInfo({ ...tripInfo, tag: v })}
                  className="bg-transparent border-white/30 text-white focus:text-slate-800 w-24"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 -mt-8 relative z-20">
          <div className="bg-white rounded-xl shadow-lg p-1.5 flex mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("itinerary")}
              className={`flex-1 py-2.5 min-w-[100px] rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === "itinerary"
                  ? "bg-red-50 text-red-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Calendar className="w-4 h-4" />
              行程安排
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`flex-1 py-2.5 min-w-[100px] rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === "info"
                  ? "bg-red-50 text-red-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Plane className="w-4 h-4" />
              交通住宿
            </button>
            <button
              onClick={() => setActiveTab("tips")}
              className={`flex-1 py-2.5 min-w-[100px] rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === "tips"
                  ? "bg-red-50 text-red-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              攻略/贴士
            </button>
          </div>

          <div className="animate-in fade-in zoom-in duration-300 pb-20">
            {activeTab === "itinerary" && renderItinerary()}
            {activeTab === "info" && renderInfo()}
            {activeTab === "tips" && renderTips()}
          </div>
        </main>

        {isEditing && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <div className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-xs flex items-center gap-2">
              <Save className="w-3 h-3" /> 编辑模式开启中...
            </div>
          </div>
        )}

        <footer className="text-center text-slate-400 text-xs mt-12 mb-4">
          <p>祝您旅途愉快！• Happy Journey</p>
        </footer>
      </div>
    </>
  );
};

export default function BeijingTripPage() {
  return <TripPlanner />;
}
