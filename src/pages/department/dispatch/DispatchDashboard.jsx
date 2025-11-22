import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users,
  BarChart3,
  ChevronUp, 
  ChevronDown,
  Info 
} from "lucide-react";
import api from "../../services/service";

const DispatchDashboard = () => {
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [masterList, setMasterList] = useState([]);
  const [filters, setFilters] = useState({
    component: "",
    customer: "",
    heat_no: "",
    batch_number: "",
    date_from: "",
    date_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [chartType, setChartType] = useState("dispatch_value");
  const [chartCategory, setChartCategory] = useState("component");
  const [npdFilter, setNpdFilter] = useState("regular"); // regular, include, only

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
    return !filters.component && !filters.heat_no && !filters.batch_number;
  }, [filters.component, filters.heat_no, filters.batch_number]);

  // Validate date range
  const validateDateRange = (dateFrom, dateTo) => {
    if (!dateFrom || !dateTo) return true;
    
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return !shouldApplyTimeRestriction || from >= sixMonthsAgo;
  };

  // Fetch master list
  const fetchMasterList = useCallback(async () => {
    try {
      const res = await api.get('/api/raw_material/masterlist/');
      setMasterList(res.data);
    } catch (err) {
      console.error("Error fetching master list:", err);
    }
  }, []);

  // Fetch dispatch records
  const fetchDispatchRecords = useCallback(async () => {
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

      const res = await api.get(`/api/dispatch/DispatchListAPIView/?${params.toString()}`);
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
      
      setDispatchRecords(allRecords);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Error fetching Dispatch data.");
    } finally {
      setLoading(false);
    }
  }, [filters, shouldApplyTimeRestriction]);

  useEffect(() => {
    fetchMasterList();
  }, [fetchMasterList]);

  // Enhanced dispatch records with master data
  const enhancedDispatchRecords = useMemo(() => {
    if (!dispatchRecords.length || !masterList.length) return [];

    return dispatchRecords.map(record => {
      // Clean component name (remove -NPD if present for matching)
      const cleanComponent = record.component.replace('-NPD', '');
      
      // Find matching master record
      const masterRecord = masterList.find(master => 
        master.component === cleanComponent || master.component === record.component
      );

      // Use dispatch price if available, else use master cost
      const price = record.price || (masterRecord ? masterRecord.cost : 0);
      const slugWeight = masterRecord ? masterRecord.slug_weight : 0;
      const customer = masterRecord ? masterRecord.customer : 'Unknown';
      
      // Calculate derived values
      const dispatchValue = record.pices * price;
      const dispatchWeightTon = (record.pices * slugWeight) / 1000;

      return {
        ...record,
        cleanComponent,
        masterRecord,
        price,
        slugWeight,
        customer,
        dispatchValue,
        dispatchWeightTon,
        isNpd: record.component?.endsWith('-NPD')
      };
    });
  }, [dispatchRecords, masterList]);

  // Filter records based on NPD selection
  const filteredRecords = useMemo(() => {
    if (!enhancedDispatchRecords.length) return [];
    
    return enhancedDispatchRecords.filter(record => {
      switch (npdFilter) {
        case 'regular':
          return !record.isNpd; // Exclude NPD parts
        case 'only':
          return record.isNpd; // Only NPD parts
        case 'include':
          return true; // Include all
        default:
          return !record.isNpd;
      }
    });
  }, [enhancedDispatchRecords, npdFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!filteredRecords.length) return {};

    const totalPieces = filteredRecords.reduce((sum, record) => sum + (record.pices || 0), 0);
    const totalValue = filteredRecords.reduce((sum, record) => sum + (record.dispatchValue || 0), 0);
    const totalWeightTon = filteredRecords.reduce((sum, record) => sum + (record.dispatchWeightTon || 0), 0);
    const averagePrice = totalPieces > 0 ? totalValue / totalPieces : 0;

    return {
      totalPieces,
      totalValue: Math.round(totalValue * 100) / 100,
      totalWeightTon: Math.round(totalWeightTon * 100) / 100,
      averagePrice: Math.round(averagePrice * 100) / 100,
      totalOrders: filteredRecords.length
    };
  }, [filteredRecords]);

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!filteredRecords.length) return [];

    const groupedData = filteredRecords.reduce((acc, record) => {
      const key = record[chartCategory] || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          pieces: 0,
          value: 0,
          weight: 0,
          count: 0,
          avgPrice: 0
        };
      }
      
      acc[key].pieces += record.pices || 0;
      acc[key].value += record.dispatchValue || 0;
      acc[key].weight += record.dispatchWeightTon || 0;
      acc[key].count += 1;
      
      return acc;
    }, {});

    return Object.entries(groupedData)
      .filter(([_, data]) => data.pieces > 0)
      .map(([name, data]) => ({
        name,
        pieces: data.pieces,
        value: Math.round(data.value * 100) / 100,
        weight: Math.round(data.weight * 100) / 100,
        count: data.count,
        avgPrice: data.pieces > 0 ? Math.round((data.value / data.pieces) * 100) / 100 : 0
      }))
      .sort((a, b) => {
        switch (chartType) {
          case 'dispatch_value': return b.value - a.value;
          case 'dispatch_pieces': return b.pieces - a.pieces;
          case 'dispatch_weight': return b.weight - a.weight;
          case 'avg_price': return b.avgPrice - a.avgPrice;
          default: return b.value - a.value;
        }
      });
  }, [filteredRecords, chartType, chartCategory]);

  // Top customers insights
  const topCustomers = useMemo(() => {
    if (!filteredRecords.length) return [];

    const customerData = filteredRecords.reduce((acc, record) => {
      const customer = record.customer;
      if (!acc[customer]) {
        acc[customer] = {
          pieces: 0,
          value: 0,
          weight: 0,
          count: 0
        };
      }
      
      acc[customer].pieces += record.pices || 0;
      acc[customer].value += record.dispatchValue || 0;
      acc[customer].weight += record.dispatchWeightTon || 0;
      acc[customer].count += 1;
      
      return acc;
    }, {});

    return Object.entries(customerData)
      .map(([customer, data]) => ({
        customer,
        pieces: data.pieces,
        value: Math.round(data.value * 100) / 100,
        weight: Math.round(data.weight * 100) / 100,
        count: data.count
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredRecords]);

  // Performance insights
  const performanceInsights = useMemo(() => {
    if (!chartData.length) return {};

    const highestValue = [...chartData].sort((a, b) => b.value - a.value)[0];
    const highestPieces = [...chartData].sort((a, b) => b.pieces - a.pieces)[0];
    const highestWeight = [...chartData].sort((a, b) => b.weight - a.weight)[0];
    const highestPrice = [...chartData].sort((a, b) => b.avgPrice - a.avgPrice)[0];

    return {
      highestValue,
      highestPieces,
      highestWeight,
      highestPrice
    };
  }, [chartData]);

  // High value components insights
  const highValueInsights = useMemo(() => {
    if (!filteredRecords.length) return [];
    
    const componentValue = filteredRecords.reduce((acc, record) => {
      if (!acc[record.component]) {
        acc[record.component] = { 
          value: 0, 
          pieces: 0, 
          count: 0, 
          isNpd: record.isNpd 
        };
      }
      
      acc[record.component].value += record.dispatchValue || 0;
      acc[record.component].pieces += record.pices || 0;
      acc[record.component].count += 1;
      
      return acc;
    }, {});
    
    return Object.entries(componentValue)
      .filter(([_, data]) => data.value > 0)
      .map(([component, data]) => ({
        component,
        value: Math.round(data.value * 100) / 100,
        pieces: data.pieces,
        recordsCount: data.count,
        isNpd: data.isNpd
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredRecords]);

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
    
    fetchDispatchRecords();
  };

  const handleResetFilters = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setFilters({
      component: "",
      customer: "",
      heat_no: "",
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
        case 'dispatch_value': return item.value;
        case 'dispatch_pieces': return item.pieces;
        case 'dispatch_weight': return item.weight;
        case 'avg_price': return item.avgPrice;
        default: return item.value;
      }
    }));
    
    return (
      <div className="max-h-[650px] overflow-y-auto pr-2 space-y-2">
        {data.map((item, index) => {
          const value = {
            'dispatch_value': item.value,
            'dispatch_pieces': item.pieces,
            'dispatch_weight': item.weight,
            'avg_price': item.avgPrice
          }[chartType];
          
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="flex items-center space-x-3 text-sm">
              <div className="w-32 truncate" title={item.name}>
                {item.name}
              </div>
              <div className="flex-1">
                <div 
                  className="bg-green-500 h-6 rounded transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="w-20 text-right font-medium">
                {value.toLocaleString()}
                {chartType === 'dispatch_value' && '₹'}
                {chartType === 'dispatch_weight' && 't'}
                {chartType === 'avg_price' && '₹'}
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
            <h2 className="text-gray-800 font-medium">Dispatch Dashboard Filters</h2>
          </div>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {showFilters && (
          <form onSubmit={handleSearch} className="p-4 bg-white space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input
                name="component"
                type="text"
                placeholder="Component"
                value={filters.component}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Dispatch Pieces</p>
              <p className="text-2xl font-bold text-gray-800">{kpis.totalPieces?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Pieces</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Dispatch Value</p>
              <p className="text-2xl font-bold text-green-600">₹{kpis.totalValue?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Revenue</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Dispatch Weight</p>
              <p className="text-2xl font-bold text-orange-600">{kpis.totalWeightTon?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Tons</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📈 Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Dispatch Analytics</h3>
            <div className="flex gap-2">
              <select 
                value={chartCategory}
                onChange={(e) => setChartCategory(e.target.value)}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="component">By Component</option>
                <option value="customer">By Customer</option>
                <option value="batch_number">By Batch</option>
              </select>
              <select 
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="dispatch_value">Dispatch Value (₹)</option>
                <option value="dispatch_pieces">Dispatch Pieces</option>
                <option value="dispatch_weight">Dispatch Weight (Ton)</option>
                <option value="avg_price">Average Price (₹)</option>
              </select>
            </div>
          </div>
          
          <SimpleBarChart data={chartData} />
        </div>

        {/* 💰 High Value Components */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-800">High Value Components</h3>
          </div>
          
          {highValueInsights.length > 0 ? (
            <div className="space-y-3">
              {highValueInsights.map((insight, index) => (
                <div key={index} className="border-l-4 border-green-400 pl-3 py-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">
                        {insight.component}
                        {insight.isNpd && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-1 rounded">NPD</span>}
                      </p>
                      <p className="text-sm text-gray-600">
                        {insight.pieces} pieces • {insight.recordsCount} orders
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                      ₹{insight.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>No high value components found</p>
            </div>
          )}
        </div>
      </div>

      {/* 📋 Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Insights */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Insights</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-800">Highest Value {chartCategory}</span>
              <span className="font-medium text-green-800">
                {performanceInsights.highestValue?.name || 'N/A'}
                {performanceInsights.highestValue && ` (₹${performanceInsights.highestValue.value.toLocaleString()})`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">Highest Pieces {chartCategory}</span>
              <span className="font-medium text-blue-800">
                {performanceInsights.highestPieces?.name || 'N/A'}
                {performanceInsights.highestPieces && ` (${performanceInsights.highestPieces.pieces} pcs)`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-orange-800">Highest Weight {chartCategory}</span>
              <span className="font-medium text-orange-800">
                {performanceInsights.highestWeight?.name || 'N/A'}
                {performanceInsights.highestWeight && ` (${performanceInsights.highestWeight.weight}t)`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-purple-800">Highest Price {chartCategory}</span>
              <span className="font-medium text-purple-800">
                {performanceInsights.highestPrice?.name || 'N/A'}
                {performanceInsights.highestPrice && ` (₹${performanceInsights.highestPrice.avgPrice})`}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Dispatch */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Dispatch</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {filteredRecords.slice(0, 10).map((record, index) => (
              <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">
                    {record.component}
                    {record.isNpd && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-1 rounded">NPD</span>}
                  </p>
                  <p className="text-sm text-gray-600">
                    {record.customer} • {record.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{record.pices} pcs</p>
                  <p className="text-sm text-green-600">₹{record.dispatchValue?.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {filteredRecords.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No dispatch records found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispatchDashboard;