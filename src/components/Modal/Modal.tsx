import { FC, ReactNode } from "react";
import noise from "../../assets/images/noise.png";

export type ModalProps = {
  isOpen: boolean;
  close: () => void;
  children: ReactNode;
};

const Modal: FC<ModalProps> = ({ isOpen, close, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-8">
      <div className="fixed inset-0 bg-stone-900 opacity-70 z-10" />
      <article className="bg-white rounded-lg z-20 relative font-['Pixelify_Sans'] max-w-7xl shadow-2xl text-yellow-400">
        <button
          className="absolute right-7 top-6 p-3 z-20 text-3xl text-shadow-custom"
          onClick={close}
        >
          X
        </button>
        <div
          className="p-0.5"
          style={{
            background:
              "linear-gradient(11.57deg, #1D1715 5.67%, #ff2f2f 68.21%)",
          }}
        >
          <div className="absolute -top-0.5 left-[10px] w-0.5 h-[26px] bg-red-600 -rotate-45" />
          <div className="absolute -top-0.5 right-[10px] w-0.5 h-[26px] bg-red-600 rotate-45" />
          <div className="absolute -bottom-0.5 left-[10px] w-0.5 h-[26px] bg-stone-800 rotate-45" />
          <div className="absolute -bottom-0.5 right-[10px] w-0.5 h-[26px] bg-stone-800 -rotate-45" />
          <div
            className="p-4"
            style={{
              background:
                "linear-gradient(120deg, #121212 -4.94%, #0c0000 18.74%, #ff1313 26.36%, #1D1715 35.66%, #1D1715 60.61%, #ff1d1d 73.72%, #1D1715 78.79%)",
            }}
          >
            <div
              className="p-0.5"
              style={{
                background:
                  "linear-gradient(11.57deg, #1D1715 5.67%, #ff2f2f 68.21%)",
              }}
            >
              <div
                className="py-16 px-20 bg-stone-900 relative"
                style={{
                  boxShadow:
                    "0px 2.41px 6.03px 3.62px rgba(255, 74, 74, 0.25) inset",
                }}
              >
                <img
                  src={noise}
                  alt="Noise"
                  className="absolute inset-0 w-full h-full object-cover z-10 opacity-20"
                />
                <div className="relative z-20 text-shadow-custom max-h-screen overflow-y-auto">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default Modal;
