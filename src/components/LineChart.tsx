import React from 'react';

interface LineChartProps {
  title: string;
  data: {
    labels: string[];
    values: number[];
  };
  color: string;
}

const LineChart: React.FC<LineChartProps> = ({ title, data, color }) => {
  const maxValue = Math.max(...data.values);
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-medium text-gray-800 mb-4">{title}</h3>
      <div className="h-40 flex items-end space-x-1">
        {data.values.map((value, index) => {
          const height = (value / maxValue) * 100;
          return (
            <div key={index} className="flex-1 h-full flex flex-col justify-end">
              <div
                className={`${color} w-full rounded-t-sm`}
                style={{ height: `${height}%` }}
              ></div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        {data.labels.map((label, index) => (
          <span key={index} className="text-xs text-gray-500 flex-1 text-center">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LineChart;