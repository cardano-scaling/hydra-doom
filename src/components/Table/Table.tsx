import { FC } from "react";

interface TableColumn {
  name: string;
}

interface TableData {
  [key: string]: string;
}

interface TableProps {
  data: TableData[];
  columns: TableColumn[];
}

const Table: FC<TableProps> = ({ data, columns }) => {
  return (
    <table className="min-w-full shadow-xl">
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th
              key={index}
              className="px-6 py-3 bg-red-600 text-center text-xl text-yellow-400 uppercase border border-red-600"
            >
              {column.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            {columns.map((column, columnIndex) => (
              <td
                key={columnIndex}
                className="px-6 py-2 whitespace-nowrap text-yellow-400 text-lg bg-stone-900 border border-red-600"
              >
                {item[column.name]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;
