import React, { useState, useRef, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

const VisualDashboard = ({ schedules, totalWeight, totalpices }) => {
  const [visible, setVisible] = useState(false);
  const [fullScreenChart, setFullScreenChart] = useState(null);
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const chartRef3 = useRef(null);

  // Process data for charts
  const processChartData = () => {
    if (!schedules || schedules.length === 0) return {};

    // Group data by component for the main chart
    const componentData = schedules.reduce((acc, item) => {
      if (!acc[item.component]) {
        acc[item.component] = {
          weight: 0,
          pices: 0,
          dates: new Set(),
          customers: new Set()
        };
      }
      acc[item.component].weight += parseFloat(item.weight);
      acc[item.component].pices += parseInt(item.pices);
      acc[item.component].dates.add(item.date1);
      acc[item.component].customers.add(item.customer);
      return acc;
    }, {});

    // Group data by customer for the customer chart
    const customerData = schedules.reduce((acc, item) => {
      if (!acc[item.customer]) {
        acc[item.customer] = {
          weight: 0,
          pices: 0,
          components: new Set()
        };
      }
      acc[item.customer].weight += parseFloat(item.weight);
      acc[item.customer].pices += parseInt(item.pices);
      acc[item.customer].components.add(item.component);
      return acc;
    }, {});

    // Group data by location for the location chart
    const locationData = schedules.reduce((acc, item) => {
      const location = item.location || 'Unknown';
      if (!acc[location]) {
        acc[location] = {
          weight: 0,
          pices: 0,
          customers: new Set()
        };
      }
      acc[location].weight += parseFloat(item.weight);
      acc[location].pices += parseInt(item.pices);
      acc[location].customers.add(item.customer);
      return acc;
    }, {});

    return { componentData, customerData, locationData };
  };

  const { componentData, customerData, locationData } = processChartData();

  // Main chart options (weight by component)
  const mainChartOptions = {
    chart: {
      type: 'column',
      height: fullScreenChart === 'main' ? '90%' : '600px',
      backgroundColor: '#f8f9fa'
    },
    title: {
      text: 'Component Weight Distribution',
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333'
      }
    },
    subtitle: {
      text: `Total Weight: ${totalWeight} kg | Total Pieces: ${totalpices}`,
      style: {
        fontSize: '12px',
        color: '#666'
      }
    },
    xAxis: {
      type: 'category',
      title: {
        text: 'Component',
        style: {
          fontWeight: 'bold'
        }
      },
       labels: {
    rotation: -45, // Rotate to prevent overlap
    style: {
      fontSize: '12px'
    },
    step: 1, // Show all labels
    autoRotation: false, // Prevent auto skipping
    reserveSpace: true
  }
    },
    yAxis: {
      title: {
        text: 'Weight (kg)',
        style: {
          fontWeight: 'bold'
        }
      },
      labels: {
        formatter: function() {
          return Highcharts.numberFormat(this.value, 0);
        }
      }
    },
    legend: {
      enabled: false
    },
    tooltip: {
      formatter: function() {
        const component = this.point.name;
        const data = componentData[component];
        const dates = Array.from(data.dates).join(', ');
        const customers = Array.from(data.customers).join(', ');
        return `
          <b>${component}</b><br/>
          Weight: <b>${Highcharts.numberFormat(data.weight, 2)} kg</b><br/>
          Pieces: <b>${data.pices}</b><br/>
          Customers: <b>${customers}</b><br/>
          Schedule Dates: <b>${dates}</b>
        `;
      }
    },
    plotOptions: {
      column: {
        dataLabels: {
          enabled: true,
          inside: false,
      crop: false,
       rotation: 90, // ✅ Correct place for rotation
      overflow: 'none',
      allowOverlap: true,
          formatter: function() {
            return Highcharts.numberFormat(this.y / 1000, 2) + ' ton'; // convert to tons
          },
          style: {
            fontSize: '12px',
            textOutline: 'none',
            rotation: 180 // ⬅ Rotate label text 90 degrees
          }
        },
        colorByPoint: true,
        colors: [
          '#4e73df'
        ]
      }
    },
    series: [{
      name: 'Weight',
      data: Object.entries(componentData || {}).map(([name, data]) => ({
        name,
        y: data.weight,
        pices: data.pices
      })).sort((a, b) => b.y - a.y),
      events: {
        click: function(event) {
          console.log('Bar clicked:', event.point.name);
        }
      }
    }],
    exporting: {
      buttons: {
        contextButton: {
          menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG']
        }
      }
    },
    credits: {
      enabled: false
    }
  };

  // Customer chart options
  const customerChartOptions = {
    chart: {
      type: 'column',
      height: '600px',
      backgroundColor: '#f8f9fa'
    },
    title: {
      text: 'Customer Distribution',
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#333'
      }
    },
    xAxis: {
  type: 'category',
  title: {
    text: 'Customer',
    style: {
      fontWeight: 'bold'
    }
  },
  labels: {
    style: {
      fontSize: '12px'
    },
    rotation: -45,
    formatter: function () {
      const maxLength = 8;
      return this.value.length > maxLength
        ? this.value.substring(0, maxLength) + '…'
        : this.value;
    }
  }
},

    yAxis: [{
      title: {
        text: 'Weight (kg)',
        style: {
          fontWeight: 'bold'
        }
      },
      labels: {
        formatter: function() {
          return Highcharts.numberFormat(this.value, 0);
        }
      }
    }, {
      title: {
        text: 'Pieces',
        style: {
          fontWeight: 'bold'
        }
      },
      opposite: true,
      labels: {
        formatter: function() {
          return Highcharts.numberFormat(this.value, 0);
        }
      }
    }],
    tooltip: {
      shared: true,
      formatter: function() {
        const customer = this.points[0].key;
        const data = customerData[customer];
        const components = Array.from(data.components).join(', ');
        return `
          <b>${customer}</b><br/>
          Weight: <b>${Highcharts.numberFormat(data.weight, 2)} kg</b><br/>
          Pieces: <b>${data.pices}</b><br/>
          Components: <b>${components}</b>
        `;
      }
    },
    plotOptions: {
  column: {
    borderRadius: 3,
    pointPadding: 0.1,
    groupPadding: 0.1,
    dataLabels: {
      enabled: true,
      inside: false,
      crop: false,
      overflow: 'none',
      formatter: function () {
        return Highcharts.numberFormat(this.y, 0);
      },
      style: {
        fontSize: '10px',
        textOutline: 'none'
      }
    }
  }
},

    series: [{
      name: 'Weight',
      data: Object.entries(customerData || {}).map(([name, data]) => ({
        name,
        y: data.weight,
        pices: data.pices
      })).sort((a, b) => b.y - a.y),
      color: '#4e73df'
    }, {
      name: 'Pieces',
      data: Object.entries(customerData || {}).map(([name, data]) => ({
        name,
        y: data.pices,
        weight: data.weight
      })).sort((a, b) => b.y - a.y),
      color: '#1cc88a',
      yAxis: 1
    }],
    exporting: {
      buttons: {
        contextButton: {
          menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG']
        }
      }
    },
    credits: {
      enabled: false
    }
  };

  // Location chart options
  const locationChartOptions = {
    chart: {
      type: 'pie',
      height: '500px',
      backgroundColor: '#f8f9fa'
    },
    title: {
      text: 'Location Distribution',
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#333'
      }
    },
    tooltip: {
      formatter: function() {
        const location = this.point.name;
        const data = locationData[location];
        const customers = Array.from(data.customers).join(', ');
        return `
          <b>${location}</b><br/>
          Weight: <b>${Highcharts.numberFormat(data.weight, 2)} kg</b><br/>
          Pieces: <b>${data.pices}</b><br/>
          Customers: <b>${customers}</b>
        `;
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.1f} %',
          style: {
            fontSize: '10px'
          }
        },
        showInLegend: true
      }
    },
    series: [{
      name: 'Weight',
      colorByPoint: true,
      data: Object.entries(locationData || {}).map(([name, data]) => ({
        name,
        y: data.weight,
        pices: data.pices
      })).sort((a, b) => b.y - a.y),
      colors: [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
        '#858796', '#5a5c69', '#3a3b45', '#2e2f3a', '#1a1c23'
      ]
    }],
    exporting: {
      buttons: {
        contextButton: {
          menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG']
        }
      }
    },
    credits: {
      enabled: false
    }
  };

  // Full screen dialog for main chart
  const fullScreenDialog = (
    <Dialog
      visible={fullScreenChart !== null}
      style={{ width: '95vw', height: '95vh' }}
      header={fullScreenChart === 'main' ? 'Component Weight Distribution' : ''}
      modal
      onHide={() => setFullScreenChart(null)}
      maximizable
      className="visual-dashboard-dialog"
    >
      <div style={{ height: '90vh', width: '100%' }}>
        {fullScreenChart === 'main' && (
          <HighchartsReact
            highcharts={Highcharts}
            options={mainChartOptions}
            containerProps={{ style: { height: '100%', width: '100%' } }}
          />
        )}
      </div>
    </Dialog>
  );

  return (
    <div className="visual-dashboard-container">
      <Button
        label="Visual Dashboard"
        icon="pi pi-chart-bar"
        onClick={() => setVisible(true)}
        className="p-button-rounded p-button-info bg-gray-200 hover:bg-blue-200 border-blue-600 rounded-full px-3 py-2 text-xs"
      />

      <Dialog
        visible={visible}
        style={{ width: '95vw', maxWidth: '1800px' }}
        header="Schedule Visual Dashboard"
        modal
        onHide={() => setVisible(false)}
        className="visual-dashboard-dialog"
      >
        <div className="grid p-fluid">
          {/* Main chart */}
          <div className="col-12">
            <div className="card p-0" style={{ border: '1px solid #e3e6f0' }}>
              <div className="flex justify-content-between align-items-center p-3 border-bottom-1 surface-border">
                <h3 className="m-0">Component Weight Distribution</h3>
                <Button
                  icon="pi pi-window-maximize"
                  className="p-button-rounded p-button-text"
                  onClick={() => setFullScreenChart('main')}
                  tooltip="View full screen"
                  tooltipOptions={{ position: 'left' }}
                />
              </div>
              <div className="p-3">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={mainChartOptions}
                  ref={chartRef1}
                />
              </div>
            </div>
          </div>

          {/* Secondary charts */}
          <div className="col-12 md:col-6">
            <div className="card p-0" style={{ border: '1px solid #e3e6f0' }}>
              <div className="flex justify-content-between align-items-center p-3 border-bottom-1 surface-border">
                <h3 className="m-0">Customer Distribution</h3>
              </div>
              <div className="p-3">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={customerChartOptions}
                  ref={chartRef2}
                />
              </div>
            </div>
          </div>

          <div className="col-12 md:col-6">
            <div className="card p-0" style={{ border: '1px solid #e3e6f0' }}>
              <div className="flex justify-content-between align-items-center p-3 border-bottom-1 surface-border">
                <h3 className="m-0">Location Distribution</h3>
              </div>
              <div className="p-3">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={locationChartOptions}
                  ref={chartRef3}
                />
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {fullScreenDialog}
    </div>
  );
};

export default VisualDashboard;