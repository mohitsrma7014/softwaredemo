export default function DateSelector({ month, year, onDateChange }) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthChange = (e) => {
    onDateChange(parseInt(e.target.value), year);
  };

  const handleYearChange = (e) => {
    onDateChange(month, parseInt(e.target.value));
  };

  return (
    <div className="flex items-center gap-4 mb-6">
      <h1 className="text-2xl font-bold">Production Analysis</h1>
      <div className="ml-auto flex gap-2">
        <select
          value={month}
          onChange={handleMonthChange}
          className="border rounded px-3 py-1"
        >
          {months.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={handleYearChange}
          className="border rounded px-3 py-1"
        >
          {Array.from({ length: 5 }, (_, i) => year - 2 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}