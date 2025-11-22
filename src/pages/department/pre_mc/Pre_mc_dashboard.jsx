import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Filter, 
  TrendingUp, 
  Factory,
  BarChart3,
  Users,
  Building,
  Target,
  Package,
  ChevronUp, 
  ChevronDown
} from "lucide-react";
import api from "../../services/service";

const Pre_mc_dashboard = () => {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    component: "",
    customer: "",
    heat_no: "",
    shop_floor: "",
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
    return !filters.component && !filters.heat_no && !filters.shop_floor && !filters.batch_number;
  }, [filters.component, filters.heat_no, filters.shop_floor, filters.batch_number]);

  // Validate date range
  const validateDateRange = (dateFrom, dateTo) => {
    if (!dateFrom || !dateTo) return true;
    
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return !shouldApplyTimeRestriction || from >= sixMonthsAgo;
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

      const res = await api.get(`/api/pre_mc/pre_mcListAPIView/?${params.toString()}`);
      const data = res.data;
      
      // Get all records without pagination
      let allRecords = data.results || [];
      let nextPage = data.next;
      let page = 1;
      
      // Fetch all pages if paginated
      while (nextPage && page < 10) {
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
      setError("Error fetching Pre-MC data.");
    } finally {
      setLoading(false);
    }
  }, [filters, shouldApplyTimeRestriction]);

  // Calculate KPIs for Pre-MC
  const kpis = useMemo(() => {
    if (!filteredRecords.length) return {};

    const totalProduction = filteredRecords.reduce((sum, record) => {
      const prod = Number(record.qty) || 0;
      return sum + (isNaN(prod) ? 0 : prod);
    }, 0);

    const totalTarget = filteredRecords.reduce((sum, record) => {
      const target = Number(record.target) || 0;
      return sum + (isNaN(target) ? 0 : target);
    }, 0);

    const totalRemaining = filteredRecords.reduce((sum, record) => {
      const remaining = Number(record.remaining) || 0;
      return sum + (isNaN(remaining) ? 0 : remaining);
    }, 0);

    const totalQuantity = filteredRecords.reduce((sum, record) => {
      const qty = Number(record.qty) || 0;
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);

    const achievementPercentage = totalTarget > 0 ? (totalProduction / totalTarget) * 100 : 0;
    const completionPercentage = totalQuantity > 0 ? (totalProduction / totalQuantity) * 100 : 0;

    return {
      totalProduction: Math.round(totalProduction),
      totalTarget: Math.round(totalTarget),
      totalRemaining: Math.round(totalRemaining),
      totalQuantity: Math.round(totalQuantity),
      achievementPercentage: Math.round(achievementPercentage * 100) / 100,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      totalBatches: filteredRecords.length
    };
  }, [filteredRecords]);

  // Calculate chart data for Pre-MC
  const chartData = useMemo(() => {
    if (!filteredRecords.length) return [];

    const groupedData = filteredRecords.reduce((acc, record) => {
      const key = record[chartCategory] || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          production: 0,
          target: 0,
          quantity: 0,
          remaining: 0,
          batches: 0,
          achievement: 0
        };
      }
      
      const production = Number(record.qty) || 0;
      const target = Number(record.target) || 0;
      const quantity = Number(record.qty) || 0;
      const remaining = Number(record.remaining) || 0;
      
      acc[key].production += production;
      acc[key].target += target;
      acc[key].quantity += quantity;
      acc[key].remaining += remaining;
      acc[key].batches += 1;
      
      return acc;
    }, {});

    return Object.entries(groupedData)
      .filter(([_, data]) => data.production > 0)
      .map(([name, data]) => {
        const achievement = data.target > 0 ? (data.production / data.target) * 100 : 0;
        const completion = data.quantity > 0 ? (data.production / data.quantity) * 100 : 0;

        return {
          name,
          production: data.production,
          target: data.target,
          quantity: data.quantity,
          remaining: data.remaining,
          batches: data.batches,
          achievement: Math.round(achievement * 100) / 100,
          completion: Math.round(completion * 100) / 100
        };
      })
      .sort((a, b) => {
        switch (chartType) {
          case 'production_pcs': return b.production - a.production;
          case 'target': return b.target - a.target;
          case 'achievement': return b.achievement - a.achievement;
          case 'completion': return b.completion - a.completion;
          case 'batches': return b.batches - a.batches;
          default: return b.production - a.production;
        }
      });
  }, [filteredRecords, chartType, chartCategory]);

  // High volume components insights
  const highVolumeInsights = useMemo(() => {
    if (!filteredRecords.length) return [];
    
    const componentProduction = filteredRecords.reduce((acc, record) => {
      const production = Number(record.qty) || 0;
      const target = Number(record.target) || 0;
      const quantity = Number(record.qty) || 0;
      const achievement = target > 0 ? (production / target) * 100 : 0;
      
      if (!acc[record.component]) {
        acc[record.component] = { 
          production: 0, 
          target: 0,
          quantity: 0,
          achievement: 0,
          batches: 0,
          isNpd: record.component?.endsWith('-NPD') 
        };
      }
      
      acc[record.component].production += production;
      acc[record.component].target += target;
      acc[record.component].quantity += quantity;
      acc[record.component].batches += 1;
      acc[record.component].achievement = achievement;
      
      return acc;
    }, {});
    
    return Object.entries(componentProduction)
      .filter(([_, data]) => data.production > 0)
      .map(([component, data]) => ({
        component,
        production: data.production,
        target: data.target,
        quantity: data.quantity,
        achievement: Math.round(data.achievement * 100) / 100,
        batches: data.batches,
        isNpd: data.isNpd
      }))
      .sort((a, b) => b.production - a.production)
      .slice(0, 10);
  }, [filteredRecords]);

  // Shop floor performance analysis
  const shopFloorAnalysis = useMemo(() => {
    if (!filteredRecords.length) return [];

    const shopFloorData = filteredRecords.reduce((acc, record) => {
      const shopFloor = record.shop_floor || 'Unknown';
      if (!acc[shopFloor]) {
        acc[shopFloor] = {
          production: 0,
          target: 0,
          quantity: 0,
          remaining: 0,
          batches: 0,
          components: new Set()
        };
      }

      const production = Number(record.qty) || 0;
      const target = Number(record.target) || 0;
      const quantity = Number(record.qty) || 0;
      const remaining = Number(record.remaining) || 0;

      acc[shopFloor].production += production;
      acc[shopFloor].target += target;
      acc[shopFloor].quantity += quantity;
      acc[shopFloor].remaining += remaining;
      acc[shopFloor].batches += 1;
      acc[shopFloor].components.add(record.component);

      return acc;
    }, {});

    return Object.entries(shopFloorData)
      .filter(([_, data]) => data.production > 0)
      .map(([shopFloor, data]) => {
        const achievement = data.target > 0 ? (data.production / data.target) * 100 : 0;
        const completion = data.quantity > 0 ? (data.production / data.quantity) * 100 : 0;

        return {
          shopFloor,
          production: data.production,
          target: data.target,
          quantity: data.quantity,
          remaining: data.remaining,
          batches: data.batches,
          componentsCount: data.components.size,
          achievement: Math.round(achievement * 100) / 100,
          completion: Math.round(completion * 100) / 100
        };
      })
      .sort((a, b) => b.production - a.production);
  }, [filteredRecords]);

  // Customer-wise analysis
  const customerAnalysis = useMemo(() => {
    if (!filteredRecords.length) return [];

    const customerData = filteredRecords.reduce((acc, record) => {
      const customer = record.customer || 'Unknown';
      if (!acc[customer]) {
        acc[customer] = {
          production: 0,
          target: 0,
          quantity: 0,
          batches: 0,
          components: new Set()
        };
      }

      const production = Number(record.qty) || 0;
      const target = Number(record.target) || 0;
      const quantity = Number(record.qty) || 0;

      acc[customer].production += production;
      acc[customer].target += target;
      acc[customer].quantity += quantity;
      acc[customer].batches += 1;
      acc[customer].components.add(record.component);

      return acc;
    }, {});

    return Object.entries(customerData)
      .filter(([_, data]) => data.production > 0)
      .map(([customer, data]) => {
        const achievement = data.target > 0 ? (data.production / data.target) * 100 : 0;

        return {
          customer,
          production: data.production,
          target: data.target,
          quantity: data.quantity,
          batches: data.batches,
          componentsCount: data.components.size,
          achievement: Math.round(achievement * 100) / 100
        };
      })
      .sort((a, b) => b.production - a.production);
  }, [filteredRecords]);

  // Performance insights for Pre-MC
  const performanceInsights = useMemo(() => {
    if (!chartData.length) return {};

    // Best performing by achievement percentage
    const bestPerforming = [...chartData]
      .filter(item => item.achievement > 0)
      .sort((a, b) => b.achievement - a.achievement)[0];

    // Highest production volume
    const highestProduction = [...chartData]
      .sort((a, b) => b.production - a.production)[0];

    // Best shop floor by achievement
    const bestShopFloor = [...shopFloorAnalysis]
      .filter(item => item.achievement > 0)
      .sort((a, b) => b.achievement - a.achievement)[0];

    // Top customer by production
    const topCustomer = [...customerAnalysis]
      .sort((a, b) => b.production - a.production)[0];

    return {
      bestPerforming,
      highestProduction,
      bestShopFloor,
      topCustomer
    };
  }, [chartData, shopFloorAnalysis, customerAnalysis]);

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
      shop_floor: "",
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
        case 'production_pcs': return item.production;
        case 'target': return item.target;
        case 'achievement': return item.achievement;
        case 'completion': return item.completion;
        case 'batches': return item.batches;
        default: return item.production;
      }
    }));
    
    return (
      <div className="max-h-[550px] overflow-y-auto pr-2 space-y-2">
        {data.map((item, index) => {
          const value = {
            'production_pcs': item.production,
            'target': item.target,
            'achievement': item.achievement,
            'completion': item.completion,
            'batches': item.batches
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
                {chartType === 'achievement' && '%'}
                {chartType === 'completion' && '%'}
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
            <h2 className="text-gray-800 font-medium">Pre Machining Dashboard Filters</h2>
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
                name="heat_no"
                type="text"
                placeholder="Heat Number"
                value={filters.heat_no}
                onChange={handleFilterChange}
                className="p-2 border rounded focus:ring focus:ring-blue-200 text-sm"
              />
              <input
                name="shop_floor"
                type="text"
                placeholder="Shop Floor"
                value={filters.shop_floor}
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

      {/* 📊 KPI Cards for Pre-MC */}
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

        {/* <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Target Achievement</p>
              <p className="text-2xl font-bold text-green-600">{kpis.achievementPercentage?.toLocaleString()}%</p>
              <p className="text-sm text-gray-500">Against Target</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div> */}

        {/* <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Order Completion</p>
              <p className="text-2xl font-bold text-purple-600">{kpis.completionPercentage?.toLocaleString()}%</p>
              <p className="text-sm text-gray-500">Against Quantity</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div> */}

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Batches</p>
              <p className="text-2xl font-bold text-orange-600">{kpis.totalBatches?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Production Batches</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📈 Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Production Analytics</h3>
            <div className="flex gap-2">
              <select 
                value={chartCategory}
                onChange={(e) => setChartCategory(e.target.value)}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="component">By Component</option>
                <option value="shop_floor">By Shop Floor</option>
                <option value="customer">By Customer</option>
              </select>
              <select 
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="production_pcs">Production (Pcs)</option>
                <option value="target">Target (Pcs)</option>
                <option value="achievement">Achievement %</option>
                <option value="completion">Completion %</option>
                <option value="batches">Batches Count</option>
              </select>
            </div>
          </div>
          
          <SimpleBarChart data={chartData} />
        </div>

        {/* 🚨 High Volume Components */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-800">High Volume Components</h3>
          </div>
          
          {highVolumeInsights.length > 0 ? (
            <div className="space-y-3">
              {highVolumeInsights.map((insight, index) => (
                <div key={index} className="border-l-4 border-blue-400 pl-3 py-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">
                        {insight.component}
                        {insight.isNpd && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-1 rounded">NPD</span>}
                      </p>
                      
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      {insight.production.toLocaleString()} pieces
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>No production data found</p>
            </div>
          )}
        </div>
      </div>

      {/* 📋 Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shop Floor Performance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Shop Floor Performance</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {shopFloorAnalysis.map((shopFloor, index) => (
              <div key={index} className="border-b pb-2 last:border-b-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-800">{shopFloor.shopFloor}</span>
                  <span className="text-green-600 font-medium">{shopFloor.achievement}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <span>Prod: {shopFloor.production.toLocaleString()}</span>
                  <span>Target: {shopFloor.target.toLocaleString()}</span>
                  <span>Batches: {shopFloor.batches}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer-wise Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer-wise Production</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {customerAnalysis.map((customer, index) => (
              <div key={index} className="border-b pb-2 last:border-b-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-800">{customer.customer}</span>
                  <span className="text-blue-600 font-medium">{customer.achievement}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <span>Prod: {customer.production.toLocaleString()}</span>
                  <span>Target: {customer.target.toLocaleString()}</span>
                  <span>Components: {customer.componentsCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-800">Best Performing {chartCategory}</span>
              <span className="font-medium text-green-800">
                {performanceInsights.bestPerforming?.name || 'N/A'}
                {performanceInsights.bestPerforming && ` (${performanceInsights.bestPerforming.achievement}%)`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">Highest Production {chartCategory}</span>
              <span className="font-medium text-blue-800">
                {performanceInsights.highestProduction?.name || 'N/A'}
                {performanceInsights.highestProduction && ` (${performanceInsights.highestProduction.production.toLocaleString()} pcs)`}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-purple-800">Best Shop Floor</span>
              <span className="font-medium text-purple-800">
                {performanceInsights.bestShopFloor?.shopFloor || 'N/A'}
                {performanceInsights.bestShopFloor && ` (${performanceInsights.bestShopFloor.achievement}%)`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-orange-800">Top Customer</span>
              <span className="font-medium text-orange-800">
                {performanceInsights.topCustomer?.customer || 'N/A'}
                {performanceInsights.topCustomer && ` (${performanceInsights.topCustomer.production.toLocaleString()} pcs)`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pre_mc_dashboard;