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
  Zap,
  DollarSign,
  Scale
} from "lucide-react";
import api from "../../services/service";

const HeatTreatmentDashboard = () => {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    component: "",
    batch_number: "",
    date_from: "",
    date_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [chartType, setChartType] = useState("production_ton");
  const [chartCategory, setChartCategory] = useState("component");
  const [npdFilter, setNpdFilter] = useState("regular");

  // Electricity cost per unit (10 Rs per unit)
  const ELECTRICITY_COST_PER_UNIT = 9;

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
    return !filters.component && !filters.batch_number;
  }, [filters.component, filters.batch_number]);

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

      const res = await api.get(`/api/heat_treatment/HeatTreatmentListAPIView/?${params.toString()}`);
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
      setError("Error fetching Heat Treatment data.");
    } finally {
      setLoading(false);
    }
  }, [filters, shouldApplyTimeRestriction]);


  // Get unique units by date, shift, furnace, process combination
  const uniqueUnitsData = useMemo(() => {
  if (!filteredRecords.length) return { totalUnits: 0, unitEntries: [] };

  // Map key: date + shift + furnace + process
  // Value: Set of unique unit identifiers seen on that combo
  const dayShiftFurnaceMap = new Map();

  filteredRecords.forEach(record => {
    const key = `${record.date}-${record.shift}-${record.furnace}-${record.process}`;
    const unitId = record.unit_number || record.unit_id || record.unitname || null; // Adjust based on your field

    const unitValue = Number(record.unit) || 0;
    if (!dayShiftFurnaceMap.has(key)) {
      dayShiftFurnaceMap.set(key, new Map());
    }

    // Deduplicate: If same unit appears twice on same day+shift+furnace+process, ignore duplicates
    const unitMap = dayShiftFurnaceMap.get(key);
    if (!unitId || !unitMap.has(unitId)) {
      unitMap.set(unitId || `__noid_${unitMap.size}`, unitValue);
    }
  });

  // Now sum up the latest (unique) units per key
  let totalUnits = 0;
  const unitEntries = [];

  for (const [key, unitMap] of dayShiftFurnaceMap.entries()) {
    const [date, shift, furnace, process] = key.split('-');
    const unitsSum = Array.from(unitMap.values()).reduce((sum, val) => sum + val, 0);
    totalUnits += unitsSum;
    unitEntries.push({ date, shift, furnace, process, units: unitsSum });
  }

  return { totalUnits, unitEntries };
}, [filteredRecords]);


  // Calculate KPIs for Heat Treatment with unique units
  const kpis = useMemo(() => {
    if (!filteredRecords.length) return {};

    const totalProduction = filteredRecords.reduce((sum, record) => {
      const prod = Number(record.production);
      return sum + (isNaN(prod) ? 0 : prod);
    }, 0);

    const totalWeightKg = filteredRecords.reduce((sum, record) => {
      const ringWeight = Number(record.ringweight);
      const production = Number(record.production);
      return sum + ((isNaN(ringWeight) || isNaN(production)) ? 0 : ringWeight * production);
    }, 0);

    const totalWeightTon = totalWeightKg / 1000;

    // Use unique units instead of summing all units
    const totalConsumedUnits = uniqueUnitsData.totalUnits;
    const totalElectricityCost = totalConsumedUnits * ELECTRICITY_COST_PER_UNIT;
    const costPerKg = totalWeightKg > 0 ? totalElectricityCost / totalWeightKg : 0;

    return {
      totalProduction: Math.round(totalProduction),
      totalConsumedUnits: Math.round(totalConsumedUnits * 100) / 100,
      totalWeightTon: Math.round(totalWeightTon * 100) / 100,
      totalElectricityCost: Math.round(totalElectricityCost),
      costPerKg: Math.round(costPerKg * 100) / 100,
      uniqueUnitEntries: uniqueUnitsData.unitEntries.length
    };
  }, [filteredRecords, uniqueUnitsData]);

  // Calculate chart data for Heat Treatment with unique units
  const chartData = useMemo(() => {
    if (!filteredRecords.length) return [];

    // First, get unique units by date-shift-furnace-process
    const uniqueUnitMap = new Map();
    filteredRecords.forEach(record => {
      const key = `${record.date}-${record.shift}-${record.furnace}-${record.process}`;
      const unit = Number(record.unit) || 0;
      if (!uniqueUnitMap.has(key) || unit > uniqueUnitMap.get(key)) {
        uniqueUnitMap.set(key, unit);
      }
    });

    // Group by chart category and calculate with unique units
    const groupedData = filteredRecords.reduce((acc, record) => {
      const key = record[chartCategory] || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          production: 0,
          weight: 0,
          uniqueUnits: 0,
          cost: 0,
          count: 0,
          unitKeys: new Set() // Track unique unit combinations
        };
      }
      
      const production = Number(record.production) || 0;
      const weight = (Number(record.ringweight) || 0) * production;
      
      // Add production and weight
      acc[key].production += production;
      acc[key].weight += weight;
      acc[key].count += 1;
      
      // Track unique unit combinations
      const unitKey = `${record.date}-${record.shift}-${record.furnace}-${record.process}`;
      if (!acc[key].unitKeys.has(unitKey)) {
        acc[key].unitKeys.add(unitKey);
        const unitValue = uniqueUnitMap.get(unitKey) || 0;
        acc[key].uniqueUnits += unitValue;
      }
      
      return acc;
    }, {});

    // Calculate cost based on unique units
    Object.keys(groupedData).forEach(key => {
      const data = groupedData[key];
      data.cost = data.uniqueUnits * ELECTRICITY_COST_PER_UNIT;
    });

    return Object.entries(groupedData)
      .filter(([_, data]) => data.production > 0)
      .map(([name, data]) => {
        const weightTon = data.weight / 1000;
        const costPerKg = data.weight > 0 ? data.cost / data.weight : 0;

        return {
          name,
          production: data.production,
          weightTon: Math.round(weightTon * 100) / 100,
          units: Math.round(data.uniqueUnits * 100) / 100,
          totalCost: Math.round(data.cost),
          costPerKg: Math.round(costPerKg * 100) / 100,
          count: data.count
        };
      })
      .sort((a, b) => {
        switch (chartType) {
          case 'production_pcs': return b.production - a.production;
          case 'production_ton': return b.weightTon - a.weightTon;
          case 'cost_total': return b.totalCost - a.totalCost;
          case 'cost_per_kg': return b.costPerKg - a.costPerKg;
          case 'units': return b.units - a.units;
          default: return b.production - a.production;
        }
      });
  }, [filteredRecords, chartType, chartCategory]);

  // High cost components insights with unique units
  const highCostInsights = useMemo(() => {
    if (!filteredRecords.length) return [];
    
    // Get unique units map first
    const uniqueUnitMap = new Map();
    filteredRecords.forEach(record => {
      const key = `${record.date}-${record.shift}-${record.furnace}-${record.process}`;
      const unit = Number(record.unit) || 0;
      if (!uniqueUnitMap.has(key) || unit > uniqueUnitMap.get(key)) {
        uniqueUnitMap.set(key, unit);
      }
    });

    const componentCost = filteredRecords.reduce((acc, record) => {
      const production = Number(record.production) || 0;
      const weight = (Number(record.ringweight) || 0) * production;
      
      if (!acc[record.component]) {
        acc[record.component] = { 
          production: 0, 
          weight: 0, 
          uniqueUnits: 0,
          cost: 0, 
          costPerKg: 0,
          count: 0, 
          isNpd: record.component?.endsWith('-NPD'),
          unitKeys: new Set()
        };
      }
      
      acc[record.component].production += production;
      acc[record.component].weight += weight;
      acc[record.component].count += 1;
      
      // Add unique units
      const unitKey = `${record.date}-${record.shift}-${record.furnace}-${record.process}`;
      if (!acc[record.component].unitKeys.has(unitKey)) {
        acc[record.component].unitKeys.add(unitKey);
        const unitValue = uniqueUnitMap.get(unitKey) || 0;
        acc[record.component].uniqueUnits += unitValue;
      }
      
      return acc;
    }, {});

    // Calculate cost and cost per kg
    Object.keys(componentCost).forEach(component => {
      const data = componentCost[component];
      data.cost = data.uniqueUnits * ELECTRICITY_COST_PER_UNIT;
      data.costPerKg = data.weight > 0 ? data.cost / data.weight : 0;
    });
    
    return Object.entries(componentCost)
      .filter(([_, data]) => data.production > 0)
      .map(([component, data]) => ({
        component,
        costPerKg: Math.round(data.costPerKg * 100) / 100,
        totalCost: Math.round(data.cost),
        production: data.production,
        weightTon: Math.round((data.weight / 1000) * 100) / 100,
        units: Math.round(data.uniqueUnits * 100) / 100,
        recordsCount: data.count,
        isNpd: data.isNpd
      }))
      .filter(item => item.costPerKg > 0)
      .sort((a, b) => b.costPerKg - a.costPerKg)
      .slice(0, 10);
  }, [filteredRecords]);

  // Furnace-wise cost analysis with unique units
  const furnaceCostAnalysis = useMemo(() => {
    if (!filteredRecords.length) return [];

    // Get unique units map first
    const uniqueUnitMap = new Map();
    filteredRecords.forEach(record => {
      const key = `${record.date}-${record.shift}-${record.furnace}-${record.process}`;
      const unit = Number(record.unit) || 0;
      if (!uniqueUnitMap.has(key) || unit > uniqueUnitMap.get(key)) {
        uniqueUnitMap.set(key, unit);
      }
    });

    const furnaceData = filteredRecords.reduce((acc, record) => {
      const furnace = record.furnace || 'Unknown';
      if (!acc[furnace]) {
        acc[furnace] = {
          production: 0,
          weight: 0,
          uniqueUnits: 0,
          cost: 0,
          count: 0,
          unitKeys: new Set()
        };
      }

      const production = Number(record.production) || 0;
      const weight = (Number(record.ringweight) || 0) * production;

      acc[furnace].production += production;
      acc[furnace].weight += weight;
      acc[furnace].count += 1;

      // Add unique units
      const unitKey = `${record.date}-${record.shift}-${record.furnace}-${record.process}`;
      if (!acc[furnace].unitKeys.has(unitKey)) {
        acc[furnace].unitKeys.add(unitKey);
        const unitValue = uniqueUnitMap.get(unitKey) || 0;
        acc[furnace].uniqueUnits += unitValue;
      }

      return acc;
    }, {});

    // Calculate cost
    Object.keys(furnaceData).forEach(furnace => {
      const data = furnaceData[furnace];
      data.cost = data.uniqueUnits * ELECTRICITY_COST_PER_UNIT;
    });

    return Object.entries(furnaceData)
      .filter(([_, data]) => data.production > 0)
      .map(([furnace, data]) => {
        const weightTon = data.weight / 1000;
        const costPerKg = data.weight > 0 ? data.cost / data.weight : 0;

        return {
          furnace,
          production: data.production,
          weightTon: Math.round(weightTon * 100) / 100,
          units: Math.round(data.uniqueUnits * 100) / 100,
          totalCost: Math.round(data.cost),
          costPerKg: Math.round(costPerKg * 100) / 100,
          efficiency: data.uniqueUnits > 0 ? Math.round((weightTon / data.uniqueUnits) * 1000) / 1000 : 0
        };
      })
      .sort((a, b) => b.costPerKg - a.costPerKg);
  }, [filteredRecords]);

  // Process-wise cost analysis with unique units
  const processCostAnalysis = useMemo(() => {
    if (!filteredRecords.length) return [];

    // Get unique units map first
    const uniqueUnitMap = new Map();
    filteredRecords.forEach(record => {
      const key = `${record.date}-${record.shift}-${record.furnace}-${record.process}`;
      const unit = Number(record.unit) || 0;
      if (!uniqueUnitMap.has(key) || unit > uniqueUnitMap.get(key)) {
        uniqueUnitMap.set(key, unit);
      }
    });

    const processData = filteredRecords.reduce((acc, record) => {
      const process = record.process || 'Unknown';
      if (!acc[process]) {
        acc[process] = {
          production: 0,
          weight: 0,
          uniqueUnits: 0,
          cost: 0,
          count: 0,
          unitKeys: new Set()
        };
      }

      const production = Number(record.production) || 0;
      const weight = (Number(record.ringweight) || 0) * production;

      acc[process].production += production;
      acc[process].weight += weight;
      acc[process].count += 1;

      // Add unique units
      const unitKey = `${record.date}-${record.shift}-${record.furnace}-${record.process}`;
      if (!acc[process].unitKeys.has(unitKey)) {
        acc[process].unitKeys.add(unitKey);
        const unitValue = uniqueUnitMap.get(unitKey) || 0;
        acc[process].uniqueUnits += unitValue;
      }

      return acc;
    }, {});

    // Calculate cost
    Object.keys(processData).forEach(process => {
      const data = processData[process];
      data.cost = data.uniqueUnits * ELECTRICITY_COST_PER_UNIT;
    });

    return Object.entries(processData)
      .filter(([_, data]) => data.production > 0)
      .map(([process, data]) => {
        const weightTon = data.weight / 1000;
        const costPerKg = data.weight > 0 ? data.cost / data.weight : 0;

        return {
          process,
          production: data.production,
          weightTon: Math.round(weightTon * 100) / 100,
          units: Math.round(data.uniqueUnits * 100) / 100,
          totalCost: Math.round(data.cost),
          costPerKg: Math.round(costPerKg * 100) / 100
        };
      })
      .sort((a, b) => b.costPerKg - a.costPerKg);
  }, [filteredRecords]);

  // Performance insights for Heat Treatment
  const performanceInsights = useMemo(() => {
    if (!chartData.length) return {};

    // Best process by cost efficiency (lowest cost per kg)
    const bestProcessByCost = [...processCostAnalysis]
      .filter(item => item.costPerKg > 0)
      .sort((a, b) => a.costPerKg - b.costPerKg)[0];

    // Best furnace by cost efficiency
    const bestFurnaceByCost = [...furnaceCostAnalysis]
      .filter(item => item.costPerKg > 0)
      .sort((a, b) => a.costPerKg - b.costPerKg)[0];

    // Highest cost process
    const highestCostProcess = [...processCostAnalysis]
      .sort((a, b) => b.costPerKg - a.costPerKg)[0];

    // Highest cost furnace
    const highestCostFurnace = [...furnaceCostAnalysis]
      .sort((a, b) => b.costPerKg - a.costPerKg)[0];

    return {
      bestProcessByCost,
      bestFurnaceByCost,
      highestCostProcess,
      highestCostFurnace
    };
  }, [chartData, processCostAnalysis, furnaceCostAnalysis]);

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
        case 'production_ton': return item.weightTon;
        case 'cost_total': return item.totalCost;
        case 'cost_per_kg': return item.costPerKg;
        case 'units': return item.units;
        default: return item.production;
      }
    }));
    
    return (
      <div className="max-h-[550px] overflow-y-auto pr-2 space-y-2">
        {data.map((item, index) => {
          const value = {
            'production_pcs': item.production,
            'production_ton': item.weightTon,
            'cost_total': item.totalCost,
            'cost_per_kg': item.costPerKg,
            'units': item.units
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
                {chartType === 'production_ton' && 't'}
                {chartType === 'cost_total' && '₹'}
                {chartType === 'cost_per_kg' && '₹/kg'}
                {chartType === 'units' && ' units'}
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
            <h2 className="text-gray-800 font-medium">Dashboard Filters</h2>
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

      {/* 📊 KPI Cards for Heat Treatment */}
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
              <p className="text-sm text-gray-600">Units Consumed</p>
              <p className="text-2xl font-bold text-orange-600">{kpis.totalConsumedUnits?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">
                {kpis.uniqueUnitEntries} unique entries
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Zap className="w-6 h-6 text-orange-600" />
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
              <Scale className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cost per Kg</p>
              <p className="text-2xl font-bold text-purple-600">₹{kpis.costPerKg?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Electricity Cost</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
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
                <option value="furnace">By Furnace</option>
                <option value="process">By Process</option>
              </select>
              <select 
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="production_pcs">Production (Pcs)</option>
                <option value="production_ton">Production (Ton)</option>
                <option value="units">Units Consumed</option>
                <option value="cost_total">Total Cost (₹)</option>
                <option value="cost_per_kg">Cost per Kg (₹)</option>
              </select>
            </div>
          </div>
          
          <SimpleBarChart data={chartData} />
        </div>

        {/* 🚨 High Cost Components */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-800">Best Process by Cost</span>
              <span className="font-medium text-green-800">
                {performanceInsights.bestProcessByCost?.process || 'N/A'}
                {performanceInsights.bestProcessByCost && ` (₹${performanceInsights.bestProcessByCost.costPerKg}/kg)`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-800">Best Furnace by Cost</span>
              <span className="font-medium text-green-800">
                {performanceInsights.bestFurnaceByCost?.furnace || 'N/A'}
                {performanceInsights.bestFurnaceByCost && ` (₹${performanceInsights.bestFurnaceByCost.costPerKg}/kg)`}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-red-800">Highest Cost Process</span>
              <span className="font-medium text-red-800">
                {performanceInsights.highestCostProcess?.process || 'N/A'}
                {performanceInsights.highestCostProcess && ` (₹${performanceInsights.highestCostProcess.costPerKg}/kg)`}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-red-800">Highest Cost Furnace</span>
              <span className="font-medium text-red-800">
                {performanceInsights.highestCostFurnace?.furnace || 'N/A'}
                {performanceInsights.highestCostFurnace && ` (₹${performanceInsights.highestCostFurnace.costPerKg}/kg)`}
              </span>
            </div>
          </div>
        </div>
      </div>
          
      </div>

      {/* 📋 Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Furnace-wise Cost Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Furnace-wise Cost Analysis</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {furnaceCostAnalysis.map((furnace, index) => (
              <div key={index} className="border-b pb-2 last:border-b-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-800">{furnace.furnace}</span>
                  <span className="text-red-600 font-medium">₹{furnace.costPerKg}/kg</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <span>Prod: {furnace.production}pcs</span>
                  <span>Weight: {furnace.weightTon}t</span>
                  <span>Units: {furnace.units}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Process-wise Cost Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Process-wise Cost Analysis</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {processCostAnalysis.map((process, index) => (
              <div key={index} className="border-b pb-2 last:border-b-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-800">{process.process}</span>
                  <span className="text-red-600 font-medium">₹{process.costPerKg}/kg</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <span>Prod: {process.production}pcs</span>
                  <span>Weight: {process.weightTon}t</span>
                  <span>Units: {process.units}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      
    </div>
  );
};

export default HeatTreatmentDashboard;