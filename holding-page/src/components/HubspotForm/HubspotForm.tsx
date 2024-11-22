import { useEffect } from "react";

declare global {
  interface Window {
    hbspt: {
      forms: {
        create: (options: {
          portalId: string;
          formId: string;
          target: string;
        }) => void;
      };
    };
  }
}

function HubspotForm() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//js.hsforms.net/forms/embed/v2.js";
    script.type = "text/javascript";
    script.onload = () => {
      if (window.hbspt) {
        window.hbspt.forms.create({
          portalId: "8848114",
          formId: "3ee90be5-f30e-4548-affd-d70873e2a739",
          target: "#hubspotForm",
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  return <div id="hubspotForm"></div>;
}

export default HubspotForm;
