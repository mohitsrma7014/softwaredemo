import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Cell, LabelList, Tooltip } from 'recharts';
import { useState, useMemo, useCallback } from 'react';
import { FiX, FiCheck, FiAlertCircle, FiInfo, FiClock, FiPlus, FiArrowRight } from 'react-icons/fi';
import api,{ BASE_URL } from "../../services/service";

const lineCapacities = {
  'HAMMER1': 180,
  'A-SET': 150,
  'B-set': 150,
  '1000 Ton': 150,
  '1600 TON': 175,
  'HAMMER2': 180,
  'W-SET': 150,
  'FFL': 150,
  'NHF-1000': 140,
};

export default function BlockMtAnalysis({ data = [], forgingData = [], month, year }) {
  const [selectedLine, setSelectedLine] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [isMoving, setIsMoving] = useState(false);
  const [moveResults, setMoveResults] = useState(null);
  
  // Memoized data processing
  const { chartData, totals } = useMemo(() => {
    // Process data for line-wise production
    const lineData = (data || []).reduce((acc, item) => {
      const line = item.line || 'Unknown';
      if (!acc[line]) {
        acc[line] = {
          line,
          totalPices: 0,
          totalWeight: 0,
          components: {},
          completed: true,
          capacity: lineCapacities[line.toUpperCase()] || 150
        };
      }
      
      if (!acc[line].components[item.component]) {
        acc[line].components[item.component] = {
          component: item.component,
          pices: item.pices || 0,
          weight: parseFloat(item.weight || 0) / 1000,
          producedPices: 0,
          producedWeight: 0,
          isCompleted: false,
          productionDates: new Set()
        };
        acc[line].totalPices += item.pices || 0;
        acc[line].totalWeight += parseFloat(item.weight || 0) / 1000;
      }

      return acc;
    }, {});

    // Process production data
    (forgingData || []).forEach(item => {
      const line = item.line || 'Unknown';
      if (!lineData[line]) {
        lineData[line] = {
          line,
          totalPices: 0,
          totalWeight: 0,
          components: {},
          completed: true,
          capacity: lineCapacities[line.toUpperCase()] || 150
        };
      }

      const componentName = item.component;
      if (!lineData[line].components[componentName]) {
        lineData[line].components[componentName] = {
          component: componentName,
          pices: 0,
          weight: 0,
          producedPices: item.production || 0,
          producedWeight: parseFloat(item.weight || item.slug_weight || 0) / 1000 * (item.production || 0),
          isCompleted: false,
          productionDates: new Set()
        };
      } else {
        const component = lineData[line].components[componentName];
        component.producedPices += item.production || 0;
        component.producedWeight += parseFloat(item.weight || item.slug_weight || 0) / 1000 * (item.production || 0);
      }

      if (item.date && lineData[line].components[componentName]) {
        lineData[line].components[componentName].productionDates.add(item.date);
      }
    });

    // Calculate completion status and convert to arrays
    Object.values(lineData).forEach(line => {
      line.components = Object.values(line.components).map(comp => {
        const isCompleted = comp.pices > 0 ? comp.producedPices >= comp.pices : false;
        
        if (comp.pices > 0 && !isCompleted) {
          line.completed = false;
        }

        return {
          ...comp,
          isCompleted,
          productionDates: Array.from(comp.productionDates).sort()
        };
      });
    });

    // Calculate chart data
    const chartData = Object.values(lineData).map(line => {
      const totalProducedPices = line.components.reduce((sum, c) => sum + (c.producedPices || 0), 0);
      const totalProducedWeight = line.components.reduce((sum, c) => sum + (c.producedWeight || 0), 0);
      const capacityUtilization = line.capacity > 0 ? (totalProducedWeight / line.capacity) * 100 : 0;

      let color;
      if (capacityUtilization < 60) {
        color = '#FF9800';
      } else if (capacityUtilization < 80) {
        color = '#FFC107';
      } else if (capacityUtilization < 100) {
        color = '#4CAF50';
      } else {
        color = '#F44336';
      }

      return {
        name: line.line,
        pices: line.totalPices,
        weight: line.totalWeight,
        producedPices: totalProducedPices,
        producedWeight: totalProducedWeight,
        completionRate: line.totalPices > 0 
          ? (line.components.reduce((sum, c) => 
              sum + (c.pices > 0 ? Math.min(c.producedPices, c.pices) : 0), 0) / line.totalPices * 100)
          : 0,
        isLineCompleted: line.completed,
        capacity: line.capacity,
        capacityUtilization,
        color,
        components: line.components
      };
    });

    // Calculate totals
    const totals = {
      plannedWeight: chartData.reduce((sum, line) => sum + (line.weight || 0), 0),
      plannedPices: chartData.reduce((sum, line) => sum + (line.pices || 0), 0),
      producedWeight: chartData.reduce((sum, line) => 
        sum + (line.components || []).reduce((s, c) => s + (c.producedWeight || 0), 0), 0),
      producedPices: chartData.reduce((sum, line) => 
        sum + (line.components || []).reduce((s, c) => s + (c.producedPices || 0), 0), 0),
      additionalWeight: chartData.reduce((sum, line) => 
        sum + (line.components || []).reduce(
          (s, c) => s + (c.pices === 0 ? (c.producedWeight || 0) : 0), 0), 0),
      additionalPices: chartData.reduce((sum, line) => 
        sum + (line.components || []).reduce(
          (s, c) => s + (c.pices === 0 ? (c.producedPices || 0) : 0), 0), 0),
      plannedCompletion: chartData.reduce((sum, line) => 
        sum + (line.components || []).reduce(
          (s, c) => s + (c.pices > 0 ? (c.producedPices || 0) : 0), 0), 0),
      totalPlanned: chartData.reduce((sum, line) => sum + (line.pices || 0), 0)
    };

    return { chartData, totals };
  }, [data, forgingData]);

  // Function to handle moving components to current month
  const handleMoveToCurrentMonth = useCallback(async () => {
    if (selectedComponents.length === 0) return;
    
    setIsMoving(true);
    try {
      const currentMonthYear = `${year}-${month.toString().padStart(2, '0')}`;
      
      const response = await api.post('api/raw_material/move-to-current-month/', {
        components: selectedComponents,
        current_month_year: currentMonthYear
      });
      
      setMoveResults(response.data);
      
      // Refresh data after successful move
      if (response.data.successful.length > 0) {
        // You might want to implement a data refresh function here
        window.location.reload(); // Simple reload for now
      }
    } catch (error) {
      console.error('Error moving components:', error);
      setMoveResults({
        error: 'Failed to move components. Please try again.'
      });
    } finally {
      setIsMoving(false);
    }
  }, [selectedComponents, month, year]);

  // Function to toggle component selection
  const toggleComponentSelection = useCallback((componentName) => {
    setSelectedComponents(prev => {
      if (prev.includes(componentName)) {
        return prev.filter(name => name !== componentName);
      } else {
        return [...prev, componentName];
      }
    });
  }, []);


  const handleBarClick = useCallback((entry) => {
    setSelectedLine(entry);
    setShowPopup(true);
  }, []);

  const closePopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  const renderCustomizedLabel = useCallback((props) => {
    const { x, y, width, value } = props;
    const formattedValue = parseFloat(value).toFixed(1);
    
    return (
      <text
        x={x + width / 2}
        y={y + 20}
        fill="#000"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
      >
        {formattedValue} ton
      </text>
    );
  }, []);

  const CustomTooltip = useCallback(({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border rounded shadow-lg">
          <p className="font-bold">{label}</p>
          <p>Planned: {data.weight.toFixed(1)} ton ({data.pices.toLocaleString()} pcs)</p>
          <p>Produced: {data.producedWeight.toFixed(1)} ton ({data.producedPices.toLocaleString()} pcs)</p>
          <p>Capacity: {data.capacity} ton</p>
          <p>Utilization: {data.capacityUtilization.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  }, []);

  const formatProductionDates = useCallback((datesArray) => {
  if (!datesArray || datesArray.length === 0) return '';
  // Create a new array before sorting to avoid mutating the original
  return [...datesArray].sort().join(', ');
}, []);

  // Categorize components for the popup
  const categorizeComponents = useCallback((components) => {
    const categorized = {
      completed: [],
      inProcess: [],
      additional: [],
      notStarted: []
    };

    components.forEach(comp => {
      const componentWithSelection = {
        ...comp,
        isSelected: selectedComponents.includes(comp.component)
      };
      
      if (comp.pices === 0) {
        categorized.additional.push(componentWithSelection);
      } else if (comp.isCompleted) {
        categorized.completed.push(componentWithSelection);
      } else if (comp.producedPices > 0) {
        categorized.inProcess.push(componentWithSelection);
      } else {
        categorized.notStarted.push(componentWithSelection);
      }
    });

    return categorized;
  }, [selectedComponents]);
  // Add a function to render the move button and results
  const renderMoveSection = useCallback(() => {
    if (selectedComponents.length === 0) return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-[9999] max-w-md">
        <h4 className="font-semibold mb-2">
          Move to Current Month ({selectedComponents.length} selected)
        </h4>
        
        {moveResults && (
          <div className="mb-3">
            {moveResults.successful && moveResults.successful.length > 0 && (
              <div className="text-green-600 mb-2">
                <p>Successfully moved:</p>
                <ul className="list-disc list-inside">
                  {moveResults.successful.map((item, index) => (
                    <li key={index}>{item.component}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {moveResults.failed && moveResults.failed.length > 0 && (
              <div className="text-red-600">
                <p>Failed to move:</p>
                <ul className="list-disc list-inside">
                  {moveResults.failed.map((item, index) => (
                    <li key={index}>{item.component}: {item.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {moveResults.error && (
              <div className="text-red-600">
                {moveResults.error}
              </div>
            )}
          </div>
        )}
        
        <button
          onClick={handleMoveToCurrentMonth}
          disabled={isMoving}
          className={`px-4 py-2 rounded-md text-white ${
            isMoving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isMoving ? 'Moving...' : (
            <>
              <FiArrowRight className="inline mr-2" />
              Move to Current Month
            </>
          )}
        </button>
        
        <button
          onClick={() => {
            setSelectedComponents([]);
            setMoveResults(null);
          }}
          className="ml-2 px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
        >
          Clear Selection
        </button>
      </div>
    );
  }, [selectedComponents, isMoving, moveResults, handleMoveToCurrentMonth]);

  // Modify the component rendering in the popup to include checkboxes
  const renderComponentWithCheckbox = useCallback((comp, category) => {
    // Only show checkbox for additional production
    const showCheckbox = category === 'notStarted';
    
    return (
      <div 
        key={comp.component} 
        className={`bg-white p-3 rounded-lg border hover:shadow-sm transition-shadow ${
          comp.isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={showCheckbox ? () => toggleComponentSelection(comp.component) : undefined}
        style={showCheckbox ? { cursor: 'pointer' } : {}}
      >
        {showCheckbox && (
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={comp.isSelected}
              onChange={() => toggleComponentSelection(comp.component)}
              onClick={(e) => e.stopPropagation()}
              className="mr-2 h-4 w-4 text-blue-600 rounded"
            />
            <span className="text-sm text-blue-600">Move to current month</span>
          </div>
        )}
        
        <div className="flex justify-between items-start">
          <div>
            <span className={`font-medium ${
              comp.isCompleted ? 'text-green-600' : 
              comp.pices === 0 ? 'text-blue-600' : 
              'text-gray-800'
            }`}>
              {comp.component}
            </span>
          </div>
          <span className={`text-sm font-semibold ${
            comp.pices > 0 && comp.producedPices < comp.pices ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            {comp.producedPices.toLocaleString()}{comp.pices > 0 ? `/${comp.pices.toLocaleString()}` : ''} pcs
          </span>
        </div>
        
        {/* Keep the rest of your component rendering logic */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-500">Weight</p>
            <p className="font-medium">
              {comp.producedWeight.toFixed(2)}{comp.pices > 0 ? `/${comp.weight.toFixed(2)}` : ''} ton
            </p>
          </div>
          {comp.pices > 0 && (
            <div>
              <p className="text-xs text-gray-500">Completion</p>
              <p className="font-medium">
                {Math.min(100, (comp.producedPices / comp.pices * 100)).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
        
        {comp.productionDates && comp.productionDates.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Production Dates</p>
            <p className="text-xs bg-gray-100 rounded px-2 py-1">
              {formatProductionDates(comp.productionDates)}
            </p>
          </div>
        )}
        
        {comp.pices > 0 && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${
                  comp.isCompleted ? 'bg-green-400' : 
                  comp.producedPices > 0 ? 'bg-yellow-400' : 
                  'bg-gray-400'
                }`} 
                style={{ 
                  width: `${Math.min(100, (comp.producedPices / comp.pices * 100))}%` 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  }, [toggleComponentSelection, formatProductionDates]);

  return (
    <div className="relative">
      <h2 className="text-xl font-semibold mb-4">Line-wise Production Planning (in Tons)</h2>
      
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#FF9800] mr-2 rounded-sm"></div>
          <span>Below 60% capacity</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#FFC107] mr-2 rounded-sm"></div>
          <span>60-80% capacity</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#4CAF50] mr-2 rounded-sm"></div>
          <span>80-100% capacity</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#F44336] mr-2 rounded-sm"></div>
          <span>Over 100% capacity</span>
        </div>
      </div>

      <div className="bg-white p-0 rounded-lg shadow mb-6">
        {chartData.length > 0 ? (
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={500}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" unit=" ton" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="weight" 
                    name="Planned Weight" 
                    fill="#8884d8"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        onClick={() => handleBarClick(entry)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                    <LabelList dataKey="weight" content={renderCustomizedLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-full lg:w-64 lg:ml-4 lg:border-l lg:pl-4  lg:mt-0">
              <h3 className="font-bold mb-4">Total Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm">Planned</h4>
                  <p className="text-lg font-bold">
                    {totals.plannedWeight.toFixed(1)} ton
                  </p>
                  <p className="text-sm">
                    {totals.plannedPices.toLocaleString()} pcs
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm">Additional Production</h4>
                  <p className="text-lg font-bold">
                    {totals.additionalWeight.toFixed(1)} ton
                  </p>
                  <p className="text-sm">
                    {totals.additionalPices.toLocaleString()} pcs
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm">Total Produced</h4>
                  <p className="text-lg font-bold">
                    {totals.producedWeight.toFixed(1)} ton
                  </p>
                  <p className="text-sm">
                    {totals.producedPices.toLocaleString()} pcs
                  </p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm">Planned Completion</h4>
                  <p className="text-lg font-bold">
                    {totals.plannedCompletion.toLocaleString()} /{' '}
                    {totals.totalPlanned.toLocaleString()} pcs
                  </p>
                  <p className="text-sm">
                    {(
                      (totals.plannedCompletion /
                      Math.max(1, totals.totalPlanned) * 100
                    ).toFixed(1))}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No production data available</div>
        )}
      </div>

      {renderMoveSection()}

      {showPopup && selectedLine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{selectedLine.name}</h3>
                <p className="text-gray-600">Line Production Details</p>
              </div>
              <button 
                onClick={closePopup}
                className="text-gray-500 hover:text-gray-700 text-2xl p-1"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
              <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <FiInfo className="mr-2" /> Planned Production
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Pieces</p>
                    <p className="text-2xl font-bold">{selectedLine.pices.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Weight</p>
                    <p className="text-2xl font-bold">{selectedLine.weight.toFixed(2)} ton</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-2 rounded-xl border border-green-100">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                  <FiCheck className="mr-2" /> Actual Production
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Pieces</p>
                    <p className="text-2xl font-bold">{selectedLine.producedPices.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Weight</p>
                    <p className="text-2xl font-bold">{selectedLine.producedWeight.toFixed(2)} ton</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-2 rounded-xl border border-purple-100">
                <h4 className="font-semibold text-purple-800 mb-1">Capacity Utilization</h4>
                <div>
                  <p className="text-sm text-gray-600">Utilization</p>
                  <p className="text-2xl font-bold">{selectedLine.capacityUtilization.toFixed(1)}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, selectedLine.capacityUtilization)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total Capacity: {selectedLine.capacity} ton</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-2 rounded-xl border border-yellow-100">
                <h4 className="font-semibold text-yellow-800 mb-1">Completion Status</h4>
                <div>
                  <p className="text-sm text-gray-600">Progress</p>
                  <p className="text-2xl font-bold">{selectedLine.completionRate.toFixed(1)}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, selectedLine.completionRate)}%` }}
                    ></div>
                  </div>
                  <div className="mt-3">
                    {selectedLine.isLineCompleted ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <FiCheck className="mr-1" /> Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <FiAlertCircle className="mr-1" /> In Progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-4">Component Details</h4>
              
              {selectedLine.components && selectedLine.components.length > 0 ? (
                <>
                  {Object.entries(categorizeComponents(selectedLine.components)).map(([category, components]) => {
                    if (components.length === 0) return null;
                    
                    let title, icon, bgColor, borderColor;
                    switch(category) {
                      case 'completed':
                        title = 'Completed Components';
                        icon = <FiCheck className="mr-2 text-green-600" />;
                        bgColor = 'bg-green-50';
                        borderColor = 'border-green-100';
                        break;
                      case 'inProcess':
                        title = 'In Process Components';
                        icon = <FiClock className="mr-2 text-yellow-600" />;
                        bgColor = 'bg-yellow-50';
                        borderColor = 'border-yellow-100';
                        break;
                      case 'additional':
                        title = 'Additional Production';
                        icon = <FiPlus className="mr-2 text-blue-600" />;
                        bgColor = 'bg-blue-50';
                        borderColor = 'border-blue-100';
                        break;
                      case 'notStarted':
                        title = 'Not Started Yet';
                        icon = <FiAlertCircle className="mr-2 text-gray-600" />;
                        bgColor = 'bg-gray-50';
                        borderColor = 'border-gray-100';
                        break;
                      default:
                        title = category;
                    }

                    return (
                      <div key={category} className={`${bgColor} ${borderColor} border rounded-xl p-4 mb-4`}>
                        <h5 className="font-semibold text-lg mb-3 flex items-center">
                          {icon} {title} ({components.length})
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {components.map((comp, i) => (
                            renderComponentWithCheckbox(comp, category)
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No components data available for this line
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}