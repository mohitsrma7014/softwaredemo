import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function ScheduleAnalysis({ data }) {
  // Process data for customer-wise schedules
  const customerData = data.reduce((acc, item) => {
    const customer = item.customer || 'Unknown';
    if (!acc[customer]) {
      acc[customer] = { customer, totalPices: 0, totalWeight: 0, totalCost: 0, components: [] };
    }
    acc[customer].totalPices += item.pices;
    acc[customer].totalWeight += parseFloat(item.weight || 0);
    acc[customer].totalCost += parseFloat(item.cost || 0) * item.pices;
    acc[customer].components.push(item);
    return acc;
  }, {});

  const pieData = Object.values(customerData).map(cust => ({
    name: cust.customer,
    value: cust.totalPices,
    weight: cust.totalWeight,
    cost: cust.totalCost
  }));

  // Calculate totals
  const totalPieces = data.reduce((sum, item) => sum + item.pices, 0);
  const totalWeight = data.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
  const totalCost = data.reduce((sum, item) => sum + (parseFloat(item.cost || 0) * item.pices), 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C', '#D0ED57'];

  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item => 
      item.component.toLowerCase().includes(term) || 
      item.customer.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border rounded shadow-lg">
          <p className="font-bold">{data.name || data.component}</p>
          <p>Scheduled Pieces: {data.value ?? data.pices}</p>
          <p>Total Weight: {(data.weight ?? 0).toFixed(2)} kg</p>
        </div>
      );
    }
    return null;
  };

  // Prepare data for component-wise bar chart
  const componentData = data.reduce((acc, item) => {
    const existing = acc.find(c => c.component === item.component);
    if (existing) {
      existing.pices += item.pices;
      existing.weight += parseFloat(item.weight || 0);
    } else {
      acc.push({
        component: item.component,
        pices: item.pices,
        weight: parseFloat(item.weight || 0),
        customer: item.customer,
        location: item.location
      });
    }
    return acc;
  }, []).sort((a, b) => b.pices - a.pices).slice(0, 10);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Customer Schedules Analysis</h2>
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Scheduled</div>
          <div className="text-2xl font-bold">
            {totalPieces.toLocaleString()} <span className="text-sm font-normal">pieces</span>
          </div>
          <div className="text-sm">
            {totalWeight.toFixed(2)} <span className="text-sm font-normal">kg</span>
            <span className="mx-2">|</span>
            ₹{totalCost.toFixed(2)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Customer-wise Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Top Components</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={componentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="component" angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pices" name="Pieces" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Detailed Schedule</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search components..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pieces</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{item.component}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.customer}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.pices}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{parseFloat(item.weight || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">₹{(parseFloat(item.cost || 0) * item.pices).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}