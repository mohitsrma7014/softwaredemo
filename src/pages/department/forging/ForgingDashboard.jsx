import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Factory,
  BarChart3,
  PieChart,
  Download,
  ChevronUp, 
  ChevronDown,Info ,Sun,Moon
} from "lucide-react";
import api from "../../services/service";

const ForgingDashboard = () => {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    component: "",
    customer: "",
    heat_number: "",
    line: "",
    batch_number: "",
    date_from: "",
    date_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [chartType, setChartType] = useState("production_ton");
  const [chartCategory, setChartCategory] = useState("component");
  const [npdFilter, setNpdFilter] = useState("regular"); // regular, include, only
const [selectedReason, setSelectedReason] = useState(null);
  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setFilters(prev => ({
      ...prev,
      date_from: thirtyDaysAgo.toISOString().split('T')[0],
      date_to: today.toISOString().split('T')[0]
    }));
  }, []);

  // Check if time restriction should apply
  const shouldApplyTimeRestriction = useMemo(() => {
    return !filters.component && !filters.heat_number && !filters.line && !filters.batch_number;
  }, [filters.component, filters.heat_number, filters.line, filters.batch_number]);

  // Validate date range
  const validateDateRange = (dateFrom, dateTo) => {
    if (!dateFrom || !dateTo) return true;
    
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return !shouldApplyTimeRestriction || from >= sixMonthsAgo;
  };
  const getTopComponentsByReason = (reason) => {
  // Group by component and sum production + rejection for the specific reason
  const grouped = filteredRecords.reduce((acc, record) => {
    const reasonRejection = record[reason] || 0;
    const production = record.production || 0;

    if (reasonRejection > 0 || production > 0) {
      if (!acc[record.component]) {
        acc[record.component] = { 
          production: 0, 
          rejection: 0 
        };
      }
      acc[record.component].production += production;
      acc[record.component].rejection += reasonRejection;
    }
    return acc;
  }, {});

  // Convert to array and sort by rejection
  return Object.entries(grouped)
    .map(([component, data]) => ({
      component,
      ...data,
      rejectionPercentage: data.production + data.rejection > 0 
        ? (data.rejection / (data.production + data.rejection)) * 100 
        : 0,
    }))
    .sort((a, b) => b.rejection - a.rejection)
    .slice(0, 5); // show top 5 components
};


  // Filter records based on NPD selection
  const filteredRecords = useMemo(() => {
    if (!records.length) return [];
    
    return records.filter(record => {
      const isNpd = record.component?.endsWith('-NPD');
      
      switch (npdFilter) {
        case 'regular':
          return !isNpd; // Exclude NPD parts
        case 'only':
          return isNpd; // Only NPD parts
        case 'include':
          return true; // Include all
        default:
          return !isNpd;
      }
    });
  }, [records, npdFilter]);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      // Apply time restriction if needed
      if (shouldApplyTimeRestriction && filters.date_from && filters.date_to) {
        const from = new Date(filters.date_from);
        const to = new Date(filters.date_to);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        if (from < sixMonthsAgo) {
          params.set('date_from', sixMonthsAgo.toISOString().split('T')[0]);
        }
      }

      const res = await api.get(`/api/forging/ForgingListAPIView/?${params.toString()}`);
      const data = res.data;
      
      // Get all records without pagination
      let allRecords = data.results || [];
      let nextPage = data.next;
      let page = 1;
      
      // Fetch all pages if paginated
      while (nextPage && page < 10) { // Safety limit
        const nextRes = await api.get(nextPage);
        const nextData = nextRes.data;
        allRecords = [...allRecords, ...(nextData.results || [])];
        nextPage = nextData.next;
        page++;
      }
      
      setRecords(allRecords);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Error fetching Forging data.");
    } finally {
      setLoading(false);
    }
  }, [filters, shouldApplyTimeRestriction]);

  const shiftSummary = useMemo(() => {
  if (!filteredRecords.length)
    return {
      totalDayShifts: 0,
      totalNightShifts: 0,
      avgDayProductionTon: 0,
      avgNightProductionTon: 0,
      lineWise: []
    };

  const daySet = new Set();
  const nightSet = new Set();
  const lineWise = {};

  const dayProduction = {};
  const nightProduction = {};

  filteredRecords.forEach(record => {
    const date = record.date || record.date_time || record.production_date;
    const line = record.line || "Unknown";
    const shift = record.shift?.toLowerCase();
    const production = Number(record.production || 0);
    const slugWeight = Number(record.slug_weight || 0);

    if (!date || !shift) return;

    // Convert production to tons
    const productionTon = (production * slugWeight) / 1000; 

    const key = `${date}_${shift}`;
    const lineKey = `${line}_${date}_${shift}`;

    // 🔹 Global totals
    if (shift === "day") {
      daySet.add(key);
      dayProduction[key] = (dayProduction[key] || 0) + productionTon;
    } else if (shift === "night") {
      nightSet.add(key);
      nightProduction[key] = (nightProduction[key] || 0) + productionTon;
    }

    // 🔹 Line-wise totals
    if (!lineWise[line])
      lineWise[line] = {
        day: new Set(),
        night: new Set(),
        dayProd: {},
        nightProd: {}
      };

    if (shift === "day") {
      lineWise[line].day.add(lineKey);
      lineWise[line].dayProd[lineKey] =
        (lineWise[line].dayProd[lineKey] || 0) + productionTon;
    } else if (shift === "night") {
      lineWise[line].night.add(lineKey);
      lineWise[line].nightProd[lineKey] =
        (lineWise[line].nightProd[lineKey] || 0) + productionTon;
    }
  });

  // 🔹 Overall Averages
  const totalDayProduction = Object.values(dayProduction).reduce((a, b) => a + b, 0);
  const totalNightProduction = Object.values(nightProduction).reduce((a, b) => a + b, 0);

  const avgDayProductionTon =
    daySet.size > 0 ? totalDayProduction / daySet.size : 0;
  const avgNightProductionTon =
    nightSet.size > 0 ? totalNightProduction / nightSet.size : 0;

  // 🔹 Line-wise averages
  const formattedLineWise = Object.entries(lineWise).map(([line, data]) => {
    const totalDayProd = Object.values(data.dayProd).reduce((a, b) => a + b, 0);
    const totalNightProd = Object.values(data.nightProd).reduce((a, b) => a + b, 0);

    return {
      line,
      dayShifts: data.day.size,
      nightShifts: data.night.size,
      avgDayProductionTon:
        data.day.size > 0 ? totalDayProd / data.day.size : 0,
      avgNightProductionTon:
        data.night.size > 0 ? totalNightProd / data.night.size : 0,
    };
  });

  return {
    totalDayShifts: daySet.size,
    totalNightShifts: nightSet.size,
    avgDayProductionTon: Math.round(avgDayProductionTon * 100) / 100,
    avgNightProductionTon: Math.round(avgNightProductionTon * 100) / 100,
    lineWise: formattedLineWise
  };
}, [filteredRecords]);



  // Calculate KPIs - memoized for performance - FIXED REJECTION CALCULATION
  const kpis = useMemo(() => {
    if (!filteredRecords.length) return {};

    const totalProduction = filteredRecords.reduce((sum, record) => sum + (record.production || 0), 0);

   

    
    const totalRejection = filteredRecords.reduce((sum, record) => 
      sum + (record.up_setting || 0) + 
      (record.half_piercing || 0) + 
      (record.full_piercing || 0) + 
      (record.ring_rolling || 0) + 
      (record.sizing || 0) + 
      (record.overheat || 0) + 
      (record.bar_crack_pcs || 0), 0
    );

    const totalWeightKg = filteredRecords.reduce((sum, record) => 
      sum + ((record.slug_weight || 0) * (record.production || 0)), 0
    );
    
    const totalWeightTon = totalWeightKg / 1000;
    
    // FIXED: For rejection percentage and PPM, use totalPieces = production + rejection
    const totalPiecesForRejection = totalProduction + totalRejection;
    const rejectionPercentage = totalPiecesForRejection > 0 ? (totalRejection / totalPiecesForRejection) * 100 : 0;
    const rejectionPPM = rejectionPercentage * 10000;

    return {
      totalProduction,
      totalRejection,
      totalWeightTon: Math.round(totalWeightTon * 100) / 100,
      rejectionPercentage: Math.round(rejectionPercentage * 100) / 100,
      rejectionPPM: Math.round(rejectionPPM),
      totalPieces: totalPiecesForRejection
    };
  }, [filteredRecords]);

  // Calculate chart data - memoized - FIXED REJECTION CALCULATION
  const chartData = useMemo(() => {
    if (!filteredRecords.length) return [];

    const groupedData = filteredRecords.reduce((acc, record) => {
      const key = record[chartCategory] || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          production: 0,
          rejection: 0,
          weight: 0,
          count: 0
        };
      }
      
      const rejection = (record.up_setting || 0) + 
        (record.half_piercing || 0) + 
        (record.full_piercing || 0) + 
        (record.ring_rolling || 0) + 
        (record.sizing || 0) + 
        (record.overheat || 0) + 
        (record.bar_crack_pcs || 0);
      
      const production = record.production || 0;
      const weight = (record.slug_weight || 0) * production;
      
      acc[key].production += production;
      acc[key].rejection += rejection;
      acc[key].weight += weight;
      acc[key].count += 1;
      
      return acc;
    }, {});

    return Object.entries(groupedData)
  // ❌ skip components with zero production
  .filter(([_, data]) => data.production > 0)
  .map(([name, data]) => {
    const totalPieces = data.production + data.rejection;
    const rejectionPercentage = totalPieces > 0 ? (data.rejection / totalPieces) * 100 : 0;
    const weightTon = data.weight / 1000;

    return {
      name,
      production: data.production,
      rejection: data.rejection,
      weightTon: Math.round(weightTon * 100) / 100,
      rejectionPercentage: Math.round(rejectionPercentage * 100) / 100,
      count: data.count,
      totalPieces
    };
  })
  .sort((a, b) => {
    switch (chartType) {
      case 'rejection_percentage': return b.rejectionPercentage - a.rejectionPercentage;
      case 'rejection_pcs': return b.rejection - a.rejection;
      case 'production_pcs': return b.production - a.production;
      case 'production_ton': return b.weightTon - a.weightTon;
      default: return b.rejectionPercentage - a.rejectionPercentage;
    }
  });

  }, [filteredRecords, chartType, chartCategory]);

  // High rejection insights - FIXED with NPD filter
  const highRejectionInsights = useMemo(() => {
    if (!filteredRecords.length) return [];
    
    const componentRejection = filteredRecords.reduce((acc, record) => {
      const rejection = (record.up_setting || 0) + 
        (record.half_piercing || 0) + 
        (record.full_piercing || 0) + 
        (record.ring_rolling || 0) + 
        (record.sizing || 0) + 
        (record.overheat || 0) + 
        (record.bar_crack_pcs || 0);
      
      const production = record.production || 0;
      const total = production + rejection;
      const percentage = total > 0 ? (rejection / total) * 100 : 0;
      
      if (!acc[record.component]) {
        acc[record.component] = { rejection: 0, production: 0, percentage: 0, count: 0, isNpd: record.component?.endsWith('-NPD') };
      }
      
      acc[record.component].rejection += rejection;
      acc[record.component].production += production;
      acc[record.component].count += 1;
      
      return acc;
    }, {});
    
   return Object.entries(componentRejection)
  .filter(([_, data]) => data.production > 0)
  .map(([component, data]) => {
    const totalPieces = data.production + data.rejection;
    const rejectionPercentage = totalPieces > 0 ? (data.rejection / totalPieces) * 100 : 0;

    return {
      component,
      rejectionPercentage: Math.round(rejectionPercentage * 100) / 100,
      totalRejection: data.rejection,
      recordsCount: data.count,
      isNpd: data.isNpd
    };
  })
  .filter(item => item.rejectionPercentage > 2)
  .sort((a, b) => b.rejectionPercentage - a.rejectionPercentage)
  .slice(0, 10);

  }, [filteredRecords]);

  // Performance insights - FIXED to show actual best performers
  const performanceInsights = useMemo(() => {
    if (!chartData.length) return {};

    // Best performing line (lowest rejection percentage)
    const bestPerformingLine = [...chartData]
      .filter(item => item.rejectionPercentage > 0) // Exclude zero rejection for meaningful comparison
      .sort((a, b) => a.rejectionPercentage - b.rejectionPercentage)[0];

    // Highest rejection customer
    const highestRejectionCustomer = [...chartData]
      .sort((a, b) => b.rejectionPercentage - a.rejectionPercentage)[0];

    // Highest production volume
    const highestProduction = [...chartData]
      .sort((a, b) => b.production - a.production)[0];

    // Highest weight production
    const highestWeight = [...chartData]
      .sort((a, b) => b.weightTon - a.weightTon)[0];

    return {
      bestPerformingLine,
      highestRejectionCustomer,
      highestProduction,
      highestWeight
    };
  }, [chartData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!validateDateRange(filters.date_from, filters.date_to)) {
      setError("Date range cannot exceed 6 months when no specific filters are applied.");
      return;
    }
    
    fetchRecords();
  };

  const handleResetFilters = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setFilters({
      component: "",
      customer: "",
      heat_number: "",
      line: "",
      batch_number: "",
      date_from: thirtyDaysAgo.toISOString().split('T')[0],
      date_to: today.toISOString().split('T')[0],
    });
    setNpdFilter("regular");
  };

  // Simple bar chart component for performance
  const SimpleBarChart = ({ data }) => {
    if (!data.length) return <div className="text-gray-500 text-center py-8">No data available</div>;
    
    const maxValue = Math.max(...data.map(item => {
      switch (chartType) {
        case 'rejection_percentage': return item.rejectionPercentage;
        case 'rejection_pcs': return item.rejection;
        case 'production_pcs': return item.production;
        case 'production_ton': return item.weightTon;
        default: return item.rejectionPercentage;
      }
    }));
    
    return (
      <div className="max-h-[550px] overflow-y-auto pr-2 space-y-2">
        {data.map((item, index) => {
          const value = {
            'rejection_percentage': item.rejectionPercentage,
            'rejection_pcs': item.rejection,
            'production_pcs': item.production,
            'production_ton': item.weightTon
          }[chartType];
          
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="flex items-center space-x-3 text-sm">
              <div className="w-32 truncate" title={item.name}>
                {item.name}
              </div>
              <div className="flex-1">
                <div 
                  className="bg-blue-500 h-6 rounded transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="w-20 text-right font-medium">
                {value.toLocaleString()}
                {chartType === 'rejection_percentage' && '%'}
                {chartType === 'production_ton' && 't'}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
     

      {/* 🔍 Filter Section */}
      <div className="bg-white border rounded-xl shadow-sm mb-6">
        <div
          className="flex justify-between items-center p-4 cursor-pointer border-b bg-gray-100 rounded-t-xl"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-700" />
            <h2 className="text-gray-800 font-medium">Forging Dashboard Filters</h2>
          </div>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {showFilters && (
          <form onSubmit={handleSearch} className="p-4 bg-white space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              <input
                name="component"
                type="text"
                placeholder="Component"
                value={filters.component}
                onChange={handleFilterChange}
                className="p-2 border rounded focus:ring focus:ring-blue-200 text-sm"
              />
              <input
                name="customer"
                type="text"
                placeholder="Customer"
                value={filters.customer}
                onChange={handleFilterChange}
                className="p-2 border rounded focus:ring focus:ring-blue-200 text-sm"
              />
              <input
                name="heat_number"
                type="text"
                placeholder="Heat Number"
                value={filters.heat_number}
                onChange={handleFilterChange}
                className="p-2 border rounded focus:ring focus:ring-blue-200 text-sm"
              />
              <input
                name="line"
                type="text"
                placeholder="Line"
                value={filters.line}
                onChange={handleFilterChange}
                className="p-2 border rounded focus:ring focus:ring-blue-200 text-sm"
              />
              <input
                name="batch_number"
                type="text"
                placeholder="Batch Number"
                value={filters.batch_number}
                onChange={handleFilterChange}
                className="p-2 border rounded focus:ring focus:ring-blue-200 text-sm"
              />
              <input
                name="date_from"
                type="date"
                placeholder="Date From"
                value={filters.date_from}
                onChange={handleFilterChange}
                className="p-2 border rounded focus:ring focus:ring-blue-200 text-sm"
              />
              <input
                name="date_to"
                type="date"
                placeholder="Date To"
                value={filters.date_to}
                onChange={handleFilterChange}
                className="p-2 border rounded focus:ring focus:ring-blue-200 text-sm"
              />
            </div>

            {/* NPD Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">NPD Parts:</label>
              <div className="flex gap-4">
                {[
                  { value: 'regular', label: 'Regular Only' },
                  { value: 'include', label: 'Include NPD' },
                  { value: 'only', label: 'Only NPD' }
                ].map(option => (
                  <label key={option.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      value={option.value}
                      checked={npdFilter === option.value}
                      onChange={(e) => setNpdFilter(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {shouldApplyTimeRestriction && (
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border">
                ⓘ Date range limited to last 6 months. Apply specific filters to remove time restriction.
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {loading ? "Loading..." : "Apply Filters"}
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  Reset
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                Showing {filteredRecords.length} records
                {npdFilter !== 'include' && (
                  <span className="ml-2 text-blue-600">
                    ({npdFilter === 'regular' ? 'Excluding NPD' : 'Only NPD'})
                  </span>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* 📊 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Production</p>
              <p className="text-2xl font-bold text-gray-800">{kpis.totalProduction?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Pieces</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Factory className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Rejection</p>
              <p className="text-2xl font-bold text-red-600">{kpis.totalRejection?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Pieces</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Production Weight</p>
              <p className="text-2xl font-bold text-green-600">{kpis.totalWeightTon?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Tons</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejection Rate</p>
              <p className="text-2xl font-bold text-orange-600">{kpis.rejectionPercentage?.toLocaleString()}%</p>
              <p className="text-sm text-gray-500">{kpis.rejectionPPM?.toLocaleString()} PPM</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600">Total Day Shifts</p>
      <p className="text-2xl font-bold text-gray-800">{shiftSummary.totalDayShifts}</p>
      <p className="text-sm text-gray-500">Unique days</p>
    </div>
    <div className="p-3 bg-yellow-100 rounded-full">
      <Sun className="w-6 h-6 text-yellow-600" />
    </div>
  </div>
</div>

<div className="bg-white p-4 rounded-xl shadow-sm border">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600">Total Night Shifts</p>
      <p className="text-2xl font-bold text-gray-800">{shiftSummary.totalNightShifts}</p>
      <p className="text-sm text-gray-500">Unique nights</p>
    </div>
    <div className="p-3 bg-indigo-100 rounded-full">
      <Moon className="w-6 h-6 text-indigo-600" />
    </div>
  </div>
</div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📈 Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Performance Analytics</h3>
            <div className="flex gap-2">
              <select 
                value={chartCategory}
                onChange={(e) => setChartCategory(e.target.value)}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="component">By Component</option>
                <option value="line">By Line</option>
                <option value="customer">By Customer</option>
              </select>
              <select 
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="rejection_percentage">Rejection %</option>
                <option value="rejection_pcs">Rejection (Pcs)</option>
                <option value="production_pcs">Production (Pcs)</option>
                <option value="production_ton">Production (Ton)</option>
              </select>
            </div>
          </div>
          
          <SimpleBarChart data={chartData} />
        </div>

        {/* 🚨 High Rejection Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-800">High Rejection Components</h3>
          </div>
          
          {highRejectionInsights.length > 0 ? (
            <div className="space-y-3">
              {highRejectionInsights.map((insight, index) => (
                <div key={index} className="border-l-4 border-red-400 pl-3 py-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">
                        {insight.component}
                        {insight.isNpd && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-1 rounded">NPD</span>}
                      </p>
                      <p className="text-sm text-gray-600">
                        {insight.totalRejection} rejected pieces
                      </p>
                    </div>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
                      {insight.rejectionPercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>No high rejection components found</p>
              <p className="text-sm">All components below 5% rejection rate</p>
            </div>
          )}
        </div>
      </div>

      {/* 📋 Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 📋 Rejection Reasons Summary */}
<div className="bg-white p-6 rounded-xl shadow-sm border">
  <h3 className="text-lg font-semibold text-gray-800 mb-4">
    Rejection Reasons Summary
  </h3>

  <div className="space-y-3">
    {[
      'up_setting', 
      'half_piercing', 
      'full_piercing', 
      'ring_rolling', 
      'sizing', 
      'overheat', 
      'bar_crack_pcs'
    ].map((reason) => {
      const total = filteredRecords.reduce((sum, record) => sum + (record[reason] || 0), 0);
      const percentage = kpis.totalRejection > 0 ? (total / kpis.totalRejection) * 100 : 0;
      const isSelected = selectedReason === reason;
      const topComponents = isSelected ? getTopComponentsByReason(reason) : [];

      return (
        <div key={reason} className="text-sm border-b last:border-none pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="capitalize text-gray-700">
                {reason.replace(/_/g, ' ')}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedReason(isSelected ? null : reason)
                }
                className="text-blue-600 hover:text-blue-800"
                title="View top components"
              >
                <Info size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">{total.toLocaleString()}</span>
              <span className="text-gray-500 w-12 text-right">
                ({Math.round(percentage)}%)
              </span>
            </div>
          </div>

          {isSelected && topComponents.length > 0 && (
            <div className="mt-2 ml-5 bg-gray-50 border border-gray-200 rounded-lg p-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-600 border-b">
                    <th className="text-left py-1">Component</th>
                    <th className="text-right py-1">Prod</th>
                    <th className="text-right py-1">Rej</th>
                    <th className="text-right py-1">%</th>
                  </tr>
                </thead>
                <tbody>
                  {topComponents.map((c, i) => (
                    <tr key={i} className="border-b last:border-none">
                      <td className="text-gray-700">{c.component}</td>
                      <td className="text-right">{c.production.toLocaleString()}</td>
                      <td className="text-right text-red-600">{c.rejection.toLocaleString()}</td>
                      <td className="text-right">{c.rejectionPercentage.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isSelected && topComponents.length === 0 && (
            <div className="mt-2 ml-5 text-gray-500 text-xs italic">
              No data for this reason
            </div>
          )}
        </div>
      );
    })}
  </div>
</div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Insights</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">Best Performing {chartCategory}</span>
              <span className="font-medium text-blue-800">
                {performanceInsights.bestPerformingLine?.name || 'N/A'}
                {performanceInsights.bestPerformingLine && ` (${performanceInsights.bestPerformingLine.rejectionPercentage}% rej)`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-red-800">Highest Rejection {chartCategory}</span>
              <span className="font-medium text-red-800">
                {performanceInsights.highestRejectionCustomer?.name || 'N/A'}
                {performanceInsights.highestRejectionCustomer && ` (${performanceInsights.highestRejectionCustomer.rejectionPercentage}% rej)`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-800">Highest Production(Pcs.) {chartCategory}</span>
              <span className="font-medium text-green-800">
                {performanceInsights.highestProduction?.name || 'N/A'}
                {performanceInsights.highestProduction && ` (${performanceInsights.highestProduction.production} pcs)`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-purple-800">Highest Prodction(Ton) {chartCategory}</span>
              <span className="font-medium text-purple-800">
                {performanceInsights.highestWeight?.name || 'N/A'}
                {performanceInsights.highestWeight && ` (${performanceInsights.highestWeight.weightTon} t)`}
              </span>
            </div>
          </div>
        </div>
       <div className="bg-white p-3 rounded-xl shadow-sm border mt-0">
  <h3 className="text-lg font-semibold text-gray-800 mb-3">
    Line-wise Shift & Avg Production (Tons)
  </h3>
  <table className="w-full text-sm border">
    <thead className="bg-gray-100 text-gray-700">
      <tr>
        <th className="text-left p-2 border">Line</th>
        <th className="text-center p-2 border">Day Shifts</th>
        <th className="text-center p-2 border">Night Shifts</th>
        <th className="text-center p-2 border">Avg Day Prod (Tons)</th>
        <th className="text-center p-2 border">Avg Night Prod (Tons)</th>
      </tr>
    </thead>
    <tbody>
      {shiftSummary.lineWise.map((line, i) => (
        <tr key={i} className="text-gray-700">
          <td className="p-2 border">{line.line}</td>
          <td className="text-center p-2 border">{line.dayShifts}</td>
          <td className="text-center p-2 border">{line.nightShifts}</td>
          <td className="text-center p-2 border">
            {line.avgDayProductionTon.toFixed(2)}
          </td>
          <td className="text-center p-2 border">
            {line.avgNightProductionTon.toFixed(2)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>



      </div>
    </div>
  );
};

export default ForgingDashboard;