import { useEffect, useRef } from "react";

const SCRIPT_SRC = "//relishsubsequentlytank.com/4bad6f43b4d5435cfdaf9cb7c11142bc/invoke.js";
const AD_OPTIONS = {
  key: "4bad6f43b4d5435cfdaf9cb7c11142bc",
  format: "iframe",
  height: 250,
  width: 300,
  params: {},
};

export default function RelishInvokeAd({ className = "", style }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") {
      return () => {};
    }

    container.innerHTML = "";

    const optionsScript = document.createElement("script");
    optionsScript.type = "text/javascript";
    optionsScript.innerHTML = `window.atOptions = ${JSON.stringify(AD_OPTIONS)}; window.atOptions = window.atOptions || {}; var atOptions = window.atOptions;`;

    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = SCRIPT_SRC;
    invokeScript.async = true;

    container.appendChild(optionsScript);
    container.appendChild(invokeScript);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return <div ref={containerRef} className={className} style={style} />;
}
