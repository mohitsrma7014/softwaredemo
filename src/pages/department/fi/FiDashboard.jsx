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
  ChevronDown,
  Info 
} from "lucide-react";
import api from "../../services/service";

const FiDashboard = () => {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    component: "",
    customer: "",
    heat_no: "",
    machine_no: "",
    batch_number: "",
    date_from: "",
    date_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [chartType, setChartType] = useState("production_pcs");
  const [chartCategory, setChartCategory] = useState("component");
  const [npdFilter, setNpdFilter] = useState("regular");
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
    return !filters.component && !filters.heat_no && !filters.machine_no && !filters.batch_number;
  }, [filters.component, filters.heat_no, filters.machine_no, filters.batch_number]);

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
    const grouped = filteredRecords.reduce((acc, record) => {
      const reasonRejection = record[reason] || 0;
      
      if (reasonRejection > 0) {
        if (!acc[record.component]) {
          acc[record.component] = { 
            rejection: 0 
          };
        }
        acc[record.component].rejection += reasonRejection;
      }
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([component, data]) => ({
        component,
        rejection: data.rejection,
      }))
      .sort((a, b) => b.rejection - a.rejection)
      .slice(0, 5);
  };

  // Filter records based on NPD selection
  const filteredRecords = useMemo(() => {
    if (!records.length) return [];
    
    return records.filter(record => {
      const isNpd = record.component?.endsWith('-NPD');
      
      switch (npdFilter) {
        case 'regular':
          return !isNpd;
        case 'only':
          return isNpd;
        case 'include':
          return true;
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

      if (shouldApplyTimeRestriction && filters.date_from && filters.date_to) {
        const from = new Date(filters.date_from);
        const to = new Date(filters.date_to);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        if (from < sixMonthsAgo) {
          params.set('date_from', sixMonthsAgo.toISOString().split('T')[0]);
        }
      }

      const res = await api.get(`/api/fi/FiListAPIView/?${params.toString()}`);
      const data = res.data;
      
      let allRecords = data.results || [];
      let nextPage = data.next;
      let page = 1;
      
      while (nextPage && page < 20) {
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
      setError("Error fetching Machining data.");
    } finally {
      setLoading(false);
    }
  }, [filters, shouldApplyTimeRestriction]);

  // Calculate KPIs - PRODUCTION ONLY FOR SETUP=II
  const kpis = useMemo(() => {
    if (!filteredRecords.length) return {};

    
    
    const totalProduction = filteredRecords.reduce((sum, record) => 
      sum + (record.production || 0), 0
    );

    // Rejection for ALL setups
    const totalRejection = filteredRecords.reduce((sum, record) => 
      sum + (record.cnc_height || 0) + 
      (record.cnc_od || 0) + 
      (record.cnc_bore || 0) + 
      (record.cnc_groove || 0) + 
      (record.cnc_dent || 0) + 
      (record.forging_height || 0) + 
      (record.forging_od || 0) + 
      (record.forging_bore || 0) + 
      (record.forging_crack || 0) + 
      (record.forging_dent || 0) + 
      (record.pre_mc_height || 0) + 
      (record.pre_mc_od || 0) + 
      (record.rust || 0) + 
      (record.pre_mc_bore || 0), 0

    );

    // Rejection by category
    const cncRejection = filteredRecords.reduce((sum, record) => 
      sum + (record.cnc_height || 0) + 
      (record.cnc_od || 0) + 
      (record.cnc_bore || 0) + 
      (record.cnc_groove || 0) + 
      (record.cnc_dent || 0), 0
    );

    const forgingRejection = filteredRecords.reduce((sum, record) => 
      sum + (record.forging_height || 0) + 
      (record.forging_od || 0) + 
      (record.forging_bore || 0) + 
      (record.forging_crack || 0) + 
      (record.forging_dent || 0), 0
    );

    const rust = filteredRecords.reduce((sum, record) => 
      sum + (record.rust || 0)  , 0
     
    );

    const preMcRejection = filteredRecords.reduce((sum, record) => 
      sum + (record.pre_mc_height || 0) + 
      (record.pre_mc_od || 0) + 
      (record.pre_mc_bore || 0), 0
    );

    // Rework calculation
    const totalRework = filteredRecords.reduce((sum, record) => 
      sum + (record.rework_height || 0) + 
      (record.rework_od || 0) + 
      (record.rework_bore || 0) + 
      (record.rework_groove || 0) + 
      (record.rework_dent || 0), 0
    );

    // Rework by status
    const reworkByStatus = {
      height: filteredRecords.reduce((sum, record) => sum + (record.rework_height || 0), 0),
      od: filteredRecords.reduce((sum, record) => sum + (record.rework_od || 0), 0),
      bore: filteredRecords.reduce((sum, record) => sum + (record.rework_bore || 0), 0),
      groove: filteredRecords.reduce((sum, record) => sum + (record.rework_groove || 0), 0),
      dent: filteredRecords.reduce((sum, record) => sum + (record.rework_dent || 0), 0),
    };

    // Efficiency calculation
const totalTarget = filteredRecords.reduce((sum, record) => sum + (record.target || 0), 0);
    const efficiencyRate = totalTarget > 0 ? (totalProduction / totalTarget) * 100 : 0;

    // Total pieces for rejection percentage (production + rejection)
    const totalPiecesForRejection = totalProduction + totalRejection;
    const rejectionPercentage = totalPiecesForRejection > 0 ? 
      (totalRejection / totalPiecesForRejection) * 100 : 0;
    const rejectionPPM = rejectionPercentage * 10000;

    return {
      totalProduction,
      totalRejection,
      rejectionPercentage: Math.round(rejectionPercentage * 100) / 100,
      rejectionPPM: Math.round(rejectionPPM),
      cncRejection,
      forgingRejection,
      preMcRejection,
      totalRework,
      rust,
      reworkByStatus,
      efficiencyRate: Math.round(efficiencyRate * 100) / 100,
      totalTarget,
      totalPieces: totalPiecesForRejection
    };
  }, [filteredRecords]);

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!filteredRecords.length) return [];

    const groupedData = filteredRecords.reduce((acc, record) => {
      const key = record[chartCategory] || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          production: 0,
          rejection: 0,
          count: 0
        };
      }
      
      // Production only for setup=II
      const production = record.production || 0;

      
      // Rejection for all setups
      const rejection = (record.cnc_height || 0) + 
        (record.cnc_od || 0) + 
        (record.cnc_bore || 0) + 
        (record.cnc_groove || 0) + 
        (record.cnc_dent || 0) + 
        (record.forging_height || 0) + 
        (record.forging_od || 0) + 
        (record.forging_bore || 0) + 
        (record.forging_crack || 0) + 
        (record.forging_dent || 0) + 
        (record.pre_mc_height || 0) + 
        (record.pre_mc_od || 0) + 
        (record.rust || 0) + 
        (record.pre_mc_bore || 0);
      
      acc[key].production += production;
      acc[key].rejection += rejection;
      acc[key].count += 1;
      
      return acc;
    }, {});

    return Object.entries(groupedData)
      .filter(([_, data]) => data.production > 0 || data.rejection > 0)
      .map(([name, data]) => {
        const totalPieces = data.production + data.rejection;
        const rejectionPercentage = totalPieces > 0 ? (data.rejection / totalPieces) * 100 : 0;

        return {
          name,
          production: data.production,
          rejection: data.rejection,
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
          default: return b.rejectionPercentage - a.rejectionPercentage;
        }
      });
  }, [filteredRecords, chartType, chartCategory]);

  // High rejection insights
  const highRejectionInsights = useMemo(() => {
    if (!filteredRecords.length) return [];
    
    const componentRejection = filteredRecords.reduce((acc, record) => {
      const rejection = (record.cnc_height || 0) + 
        (record.cnc_od || 0) + 
        (record.cnc_bore || 0) + 
        (record.cnc_groove || 0) + 
        (record.cnc_dent || 0) + 
        (record.forging_height || 0) + 
        (record.forging_od || 0) + 
        (record.forging_bore || 0) + 
        (record.forging_crack || 0) + 
        (record.forging_dent || 0) + 
        (record.pre_mc_height || 0) + 
        (record.pre_mc_od || 0) + 
        (record.rust || 0) + 
        (record.pre_mc_bore || 0);
      
      const production = record.setup?.toUpperCase() === 'II' ? (record.production || 0) : 0;
      const total = production + rejection;
      const percentage = total > 0 ? (rejection / total) * 100 : 0;
      
      if (!acc[record.component]) {
        acc[record.component] = { 
          rejection: 0, 
          production: 0, 
          percentage: 0, 
          count: 0, 
          isNpd: record.component?.endsWith('-NPD') 
        };
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

  // Performance insights
  const performanceInsights = useMemo(() => {
    if (!chartData.length) return {};

    const bestPerforming = [...chartData]
      .filter(item => item.rejectionPercentage > 0)
      .sort((a, b) => a.rejectionPercentage - b.rejectionPercentage)[0];

    const highestRejection = [...chartData]
      .sort((a, b) => b.rejectionPercentage - a.rejectionPercentage)[0];

    const highestProduction = [...chartData]
      .sort((a, b) => b.production - a.production)[0];

    return {
      bestPerforming,
      highestRejection,
      highestProduction
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
      heat_no: "",
      machine_no: "",
      batch_number: "",
      date_from: thirtyDaysAgo.toISOString().split('T')[0],
      date_to: today.toISOString().split('T')[0],
    });
    setNpdFilter("regular");
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data }) => {
    if (!data.length) return <div className="text-gray-500 text-center py-8">No data available</div>;
    
    const maxValue = Math.max(...data.map(item => {
      switch (chartType) {
        case 'rejection_percentage': return item.rejectionPercentage;
        case 'rejection_pcs': return item.rejection;
        case 'production_pcs': return item.production;
        default: return item.rejectionPercentage;
      }
    }));
    
    return (
      <div className="max-h-[550px] overflow-y-auto pr-2 space-y-2">
        {data.map((item, index) => {
          const value = {
            'rejection_percentage': item.rejectionPercentage,
            'rejection_pcs': item.rejection,
            'production_pcs': item.production
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
                {chartType === 'production_pcs' && 'pcs'}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Rejection reasons for summary
  const rejectionReasons = [
    { key: 'cnc_height', label: 'CNC Height', category: 'cnc' },
    { key: 'cnc_od', label: 'CNC OD', category: 'cnc' },
    { key: 'cnc_bore', label: 'CNC Bore', category: 'cnc' },
    { key: 'cnc_groove', label: 'CNC Groove', category: 'cnc' },
    { key: 'cnc_dent', label: 'CNC Dent', category: 'cnc' },
    { key: 'forging_height', label: 'Forging Height', category: 'forging' },
    { key: 'forging_od', label: 'Forging OD', category: 'forging' },
    { key: 'forging_bore', label: 'Forging Bore', category: 'forging' },
    { key: 'forging_crack', label: 'Forging Crack', category: 'forging' },
    { key: 'forging_dent', label: 'Forging Dent', category: 'forging' },
    { key: 'pre_mc_height', label: 'Pre MC Height', category: 'pre_mc' },
    { key: 'pre_mc_od', label: 'Pre MC OD', category: 'pre_mc' },
    { key: 'pre_mc_bore', label: 'Pre MC Bore', category: 'pre_mc' },
    { key: 'rust', label: 'Rust', category: 'rust' },
  ];

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
            <h2 className="text-gray-800 font-medium">Final Inspection Dashboard Filters</h2>
          </div>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {showFilters && (
          <form onSubmit={handleSearch} className="p-4 bg-white space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input
                name="component"
                type="text"
                placeholder="Component"
                value={filters.component}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              <p className="text-sm text-gray-600">Efficiency Rate</p>
              <p className="text-2xl font-bold text-green-600">{kpis.efficiencyRate?.toLocaleString()}%</p>
              <p className="text-sm text-gray-500">Target: {kpis.totalTarget?.toLocaleString()}</p>
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
      </div>

      {/* Rejection by Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CNC Rejection</p>
              <p className="text-xl font-bold text-blue-600">{kpis.cncRejection?.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <Factory className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Forging Rejection</p>
              <p className="text-xl font-bold text-red-600">{kpis.forgingRejection?.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pre-MC Rejection</p>
              <p className="text-xl font-bold text-purple-600">{kpis.preMcRejection?.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rust</p>
              <p className="text-xl font-bold text-purple-600">{kpis.rust?.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📈 Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Machining Performance Analytics</h3>
            <div className="flex gap-2">
              <select 
                value={chartCategory}
                onChange={(e) => setChartCategory(e.target.value)}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="component">By Component</option>
                <option value="machine_no">By Machine</option>
                <option value="mc_type">By Process</option>
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
              <p className="text-sm">All components below 2% rejection rate</p>
            </div>
          )}
        </div>
      </div>

      {/* 📋 Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 📋 Rejection Reasons Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Rejection Reasons Summary
          </h3>

          <div className="space-y-3  overflow-y-auto">
            {rejectionReasons.map((reason) => {
              const total = filteredRecords.reduce((sum, record) => sum + (record[reason.key] || 0), 0);
              const percentage = kpis.totalRejection > 0 ? (total / kpis.totalRejection) * 100 : 0;
              const isSelected = selectedReason === reason.key;
              const topComponents = isSelected ? getTopComponentsByReason(reason.key) : [];

              return (
                <div key={reason.key} className="text-sm border-b last:border-none pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        reason.category === 'cnc' ? 'bg-blue-100 text-blue-800' :
                        reason.category === 'forging' ? 'bg-red-100 text-red-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {reason.category.toUpperCase()}
                      </span>
                      <span className="text-gray-700">
                        {reason.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedReason(isSelected ? null : reason.key)
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
                            <th className="text-right py-1">Rejection</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topComponents.map((c, i) => (
                            <tr key={i} className="border-b last:border-none">
                              <td className="text-gray-700">{c.component}</td>
                              <td className="text-right text-red-600">{c.rejection.toLocaleString()}</td>
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

        {/* Rework and Performance Insights */}
        <div className="space-y-6">
          {/* Rework Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rework Summary</h3>

            <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <span className="text-sm text-yellow-800">Total Rework</span>
                <span className="font-medium text-yellow-800">
                    {kpis.totalRework?.toLocaleString()} pcs
                </span>
                </div>

                {kpis.reworkByStatus &&
                Object.entries(kpis.reworkByStatus).map(([status, count]) => {
                    if (count <= 0) return null;

                    const reasonKey = `rework_${status}`;
                    const isSelected = selectedReason === reasonKey;
                    const topComponents = isSelected ? getTopComponentsByReason(reasonKey) : [];

                    return (
                    <div key={status} className="text-sm border-b last:border-none pb-2">
                        <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="capitalize text-gray-700">
                            {status.replace("_", " ")}
                            </span>

                            {/* Info button to show top components */}
                            <button
                            type="button"
                            onClick={() =>
                                setSelectedReason(isSelected ? null : reasonKey)
                            }
                            className="text-blue-600 hover:text-blue-800"
                            title="View top components"
                            >
                            <Info size={16} />
                            </button>
                        </div>

                        <span className="font-medium">{count.toLocaleString()}</span>
                        </div>

                        {/* Show top 5 components when expanded */}
                        {isSelected && topComponents.length > 0 && (
                        <div className="mt-2 ml-5 bg-gray-50 border border-gray-200 rounded-lg p-2">
                            <table className="w-full text-xs">
                            <thead>
                                <tr className="text-gray-600 border-b">
                                <th className="text-left py-1">Component</th>
                                <th className="text-right py-1">Rework</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topComponents.map((c, i) => (
                                <tr key={i} className="border-b last:border-none">
                                    <td className="text-gray-700">{c.component}</td>
                                    <td className="text-right text-yellow-700">
                                    {c.rejection.toLocaleString()}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                        )}

                        {isSelected && topComponents.length === 0 && (
                        <div className="mt-2 ml-5 text-gray-500 text-xs italic">
                            No data for this rework type
                        </div>
                        )}
                    </div>
                    );
                })}
            </div>
            </div>


          {/* Performance Insights */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Insights</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-800">Best Performing {chartCategory}</span>
                <span className="font-medium text-blue-800">
                  {performanceInsights.bestPerforming?.name || 'N/A'}
                  {performanceInsights.bestPerforming && ` (${performanceInsights.bestPerforming.rejectionPercentage}% rej)`}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-red-800">Highest Rejection {chartCategory}</span>
                <span className="font-medium text-red-800">
                  {performanceInsights.highestRejection?.name || 'N/A'}
                  {performanceInsights.highestRejection && ` (${performanceInsights.highestRejection.rejectionPercentage}% rej)`}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-800">Highest Production {chartCategory}</span>
                <span className="font-medium text-green-800">
                  {performanceInsights.highestProduction?.name || 'N/A'}
                  {performanceInsights.highestProduction && ` (${performanceInsights.highestProduction.production} pcs)`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiDashboard;