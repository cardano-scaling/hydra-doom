import Card from "../Card";

const GlobalTotals = () => {
  const totals = [
    { label: "Games (all-time):", value: "7,384" },
    { label: "Games (active):", value: "0" },
    { label: "Transactions:", value: "106,791,272" },
    { label: "Bytes:", value: "54,502,739,168" },
    { label: "Kills:", value: "77,808" },
    { label: "Items:", value: "58,999" },
    { label: "Secrets:", value: "1,408" },
    { label: "Play time:", value: "21:08:08:25" },
  ];

  return (
    <div className="text-lg text-white">
      <h1 className="mb-4 text-white text-3xl uppercase text-center">
        Global Totals
      </h1>
      <Card className="py-4 px-6">
        <table className="w-full leading-6">
          <tbody>
            {totals.map((total) => (
              <tr key={total.label}>
                <td>{total.label}</td>
                <td className="text-yellow-400">{total.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default GlobalTotals;
