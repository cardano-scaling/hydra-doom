import { FC, PropsWithChildren } from "react";
import Logos from "../Logos";
import MainBackground from "../MainBackground";

const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <main className="relative min-h-screen">
      <div className="z-20 relative flex flex-col items-center">
        <Logos />
        {children}
      </div>
      <MainBackground />
    </main>
  );
};

export default Layout;
