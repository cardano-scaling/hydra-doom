import Card from "../Card";

const GlobalTotals = () => {
  return (
    <div className="text-lg text-white">
      <h1 className="mb-4 text-white text-3xl uppercase text-center">
        Global Totals
      </h1>
      <Card>
        <table className="w-full">
          <tbody>
            <tr>
              <td>Games (all-time):</td>
              <td className="text-yellow-400">7,384</td>
            </tr>
            <tr>
              <td>Games (active):</td>
              <td className="text-yellow-400">0</td>
            </tr>
            <tr>
              <td>Transactions:</td>
              <td className="text-yellow-400">106,791,272</td>
            </tr>
            <tr>
              <td>Bytes:</td>
              <td className="text-yellow-400">54,502,739,168</td>
            </tr>
            <tr>
              <td>Kills:</td>
              <td className="text-yellow-400">77,808</td>
            </tr>
            <tr>
              <td>Items:</td>
              <td className="text-yellow-400">58,999</td>
            </tr>
            <tr>
              <td>Secrets:</td>
              <td className="text-yellow-400">1,408</td>
            </tr>
            <tr>
              <td>Play time:</td>
              <td className="text-yellow-400">21:08:08:25</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default GlobalTotals;
