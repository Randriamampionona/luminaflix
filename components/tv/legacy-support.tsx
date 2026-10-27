import Script from "next/script";

/**
 * Smart TV / legacy browser support (see TV_SUPPORT.md).
 *
 * 1. Runs before the page paints (in <head>): tags <html> with
 *    - "tv" on Smart TV browsers (Tizen, webOS, Android TV, Fire TV, Hisense,
 *      Philips, Bravia…) → TV scaling rules in globals.css;
 *    - "legacy-css" on engines older than Chromium 88 / Safari 15.
 * 2. Flexbox `gap` polyfill for engines without it (Chromium < 84, Safari < 14.1):
 *    turns the gap of flex containers into child margins, and keeps doing it as
 *    React updates the page. Does nothing at all on modern browsers.
 */
const DETECT = `(function(){try{var d=document.documentElement,u=navigator.userAgent||"";
if(/SmartTV|SMART-TV|Tizen|Web0S|webOS|NetCast|HbbTV|BRAVIA|AFT[A-Z]|GoogleTV|Android TV|CrKey|Viera|VIDAA|Hisense|Philips|; TV;|TV Safari|AppleTV/i.test(u))d.className+=" tv";
if(!(window.CSS&&CSS.supports&&CSS.supports("aspect-ratio","1 / 1")))d.className+=" legacy-css";}catch(e){}})();`;

const FLEX_GAP = `(function(){try{
var t=document.createElement("div");t.style.display="flex";t.style.flexDirection="column";t.style.rowGap="1px";
t.appendChild(document.createElement("div"));t.appendChild(document.createElement("div"));
document.body.appendChild(t);var ok=t.scrollHeight===1;document.body.removeChild(t);if(ok)return;
document.documentElement.className+=" no-flex-gap";
var queued=false;
function apply(){queued=false;var els=document.querySelectorAll('[class*="gap-"]');
for(var i=0;i<els.length;i++){var el=els[i],cs=getComputedStyle(el);if(cs.display.indexOf("flex")<0)continue;
var rg=parseFloat(cs.rowGap)||0,cg=parseFloat(cs.columnGap)||0;if(!rg&&!cg)continue;
var col=cs.flexDirection.indexOf("column")===0,rev=cs.flexDirection.indexOf("reverse")>0,wrap=cs.flexWrap!=="nowrap",first=true;
for(var j=0;j<el.children.length;j++){var c=el.children[j];if(getComputedStyle(c).display==="none"||c.getAttribute("data-gap-skip")!==null)continue;
var s=c.style;if(c.__lfgap){s.marginTop=s.marginLeft=s.marginRight=s.marginBottom="";}
var side=col?(rev?"marginBottom":"marginTop"):(rev?"marginRight":"marginLeft");
if(!first&&(col?rg:cg)&&!parseFloat(getComputedStyle(c)[side])){s[side]=(col?rg:cg)+"px";c.__lfgap=1;}
if(wrap&&!col&&rg&&!parseFloat(getComputedStyle(c).marginBottom)){s.marginBottom=rg+"px";c.__lfgap=1;}
first=false;}}}
function schedule(){if(!queued){queued=true;setTimeout(apply,120);}}
schedule();window.addEventListener("load",schedule);window.addEventListener("resize",schedule);
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
}catch(e){}})();`;

export default function LegacySupport() {
  return (
    <>
      <Script id="lf-tv-detect" strategy="beforeInteractive">
        {DETECT}
      </Script>
      <Script id="lf-flex-gap" strategy="afterInteractive">
        {FLEX_GAP}
      </Script>
    </>
  );
}
