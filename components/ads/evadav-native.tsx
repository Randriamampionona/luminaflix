import Script from "next/script";

const EvadavNative = () => {
  return (
    <>
      {/* We use strategy "afterInteractive" so the ad doesn't 
          slow down your initial page load. 
      */}
      <Script
        src="https://curoax.com/na/waWQiOjEyMjA5MTUsInNpZCI6MTY1ODI3Mywid2lkIjo3MzQ1MzYsInNyYyI6Mn0=eyJ.js"
        strategy="afterInteractive"
        async
      />

      {/* If Evadav requires a specific container to render the ads, 
          add it here. Usually, native ads look for a div with a specific ID.
          Check your Evadav dashboard for a 'placement ID' if needed.
      */}
      <div
        id="evadav-native-placement"
        className="my-8 w-full min-h-25 flex justify-center"
      />
    </>
  );
};

export default EvadavNative;
