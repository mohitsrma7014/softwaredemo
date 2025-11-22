import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const ForgingAnalysis = ({ data, lineCapacities }) => {
  // Calculate KPIs and aggregate data
  const calculateKPIs = () => {
    const lineStats = {};
    const statusCounts = {
      running: 0,
      idle: 0,
      breakdown: 0,
      maintenance: 0
    };
    let totalDowntime = 0;

    data.forEach(item => {
      // Initialize line stats if not exists
      if (!lineStats[item.line]) {
        lineStats[item.line] = {
          production: 0,
          target: 0,
          downtime: 0,
          efficiency: 0,
          statusCounts: {
            running: 0,
            idle: 0,
            breakdown: 0,
            maintenance: 0
          }
        };
      }

      // Accumulate values
      lineStats[item.line].production += item.production || 0;
      lineStats[item.line].target += item.target || 0;
      lineStats[item.line].downtime += item.downtime_minutes || 0;
      
      // Count statuses
      lineStats[item.line].statusCounts[item.machine_status]++;
      statusCounts[item.machine_status]++;
      
      totalDowntime += item.downtime_minutes || 0;
    });

    // Calculate efficiency for each line
    Object.keys(lineStats).forEach(line => {
      const capacity = lineCapacities[line] || 1; // Avoid division by zero
      lineStats[line].efficiency = Math.round(
        (lineStats[line].production / capacity) * 100
      );
    });

    return { lineStats, statusCounts, totalDowntime };
  };

  const { lineStats, statusCounts, totalDowntime } = calculateKPIs();

  // Prepare data for charts
  const productionData = {
    labels: Object.keys(lineStats),
    datasets: [
      {
        label: 'Actual Production',
        data: Object.values(lineStats).map(stat => stat.production),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'Target',
        data: Object.values(lineStats).map(stat => stat.target),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const efficiencyData = {
    labels: Object.keys(lineStats),
    datasets: [
      {
        label: 'Efficiency %',
        data: Object.values(lineStats).map(stat => stat.efficiency),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const statusData = {
    labels: Object.keys(statusCounts),
    datasets: [
      {
        data: Object.values(statusCounts),
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)', // running - blue
          'rgba(255, 206, 86, 0.5)',  // idle - yellow
          'rgba(255, 99, 132, 0.5)',  // breakdown - red
          'rgba(153, 102, 255, 0.5)', // maintenance - purple
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Get top reasons for downtime
  const getDowntimeReasons = () => {
    const reasons = {};
    data.forEach(item => {
      if (item.reason_for_downtime) {
        reasons[item.reason_for_downtime] = 
          (reasons[item.reason_for_downtime] || 0) + (item.downtime_minutes || 0);
      }
    });
    return Object.entries(reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 reasons
  };

  const topDowntimeReasons = getDowntimeReasons();

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Production Dashboard</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Total Production</h3>
          <p className="text-2xl font-bold">
            {Object.values(lineStats).reduce((sum, stat) => sum + stat.production, 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Total Downtime</h3>
          <p className="text-2xl font-bold">{totalDowntime} minutes</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Avg Efficiency</h3>
          <p className="text-2xl font-bold">
            {Math.round(
              Object.values(lineStats).reduce((sum, stat) => sum + stat.efficiency, 0) / 
              Object.keys(lineStats).length
            )}%
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Active Lines</h3>
          <p className="text-2xl font-bold">{Object.keys(lineStats).length}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Production vs Target by Line</h3>
          <Bar 
            data={productionData}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Pieces'
                  }
                }
              }
            }}
          />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Machine Status Distribution</h3>
          <Pie 
            data={statusData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'right',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Line Efficiency</h3>
          <Bar 
            data={efficiencyData}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  title: {
                    display: true,
                    text: 'Efficiency %'
                  }
                }
              }
            }}
          />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Top Downtime Reasons</h3>
          <ul className="space-y-2">
            {topDowntimeReasons.map(([reason, minutes], index) => (
              <li key={index} className="flex justify-between">
                <span>{reason}</span>
                <span className="font-medium">{minutes} minutes</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4">Production Details</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Production</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downtime</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">{item.date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.line}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.component}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.machine_status === 'running' ? 'bg-blue-100 text-blue-800' :
                    item.machine_status === 'idle' ? 'bg-yellow-100 text-yellow-800' :
                    item.machine_status === 'breakdown' ? 'bg-red-100 text-red-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {item.machine_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.production} / {item.target}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{item.downtime_minutes} min</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {Math.round((item.production / (lineCapacities[item.line] || 1)) * 100)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.reason_for_downtime || item.reason_for_low_production || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ForgingAnalysis;