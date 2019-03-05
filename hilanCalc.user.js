// ==UserScript==
// @name         hilanCalc
// @version      2.0
// @description  calculate monthly working hours
// @author       Daniel Erez
// @match        https://*.net.hilan.co.il/Hilannetv2/*
// @exclude      https://*.net.hilan.co.il/Hilannetv2/UIV2/main.aspx
// @grant        GM_addStyle
// ==/UserScript==

(function() {

    function start(){
        if ($("#calendarPlace").length==0 || $(".calc").length) return;
        BuildUI();
        calcData();
    }

    function calcData(){
        var data={wh:0,standard_wh:0, days:0};
        $("table#calendar_container>tbody>tr>td").each(function(){
            if(!$(this).has(".calc-dot").length) return;
            if($(this).has(".calc-dot.not-calc").length) return;
            data.standard_wh+=parseInt($(this).find(".calc-dot").attr("standard-wh"));
            var arr=$(this).find(".cDM").html().split(":");
            data.wh+=parseInt(arr[0])*60+parseInt(arr[1]);
            data.days++;
        })
        data.diff=data.wh-data.standard_wh;
        $(".CalendarPageLastText .calcData.tootal-days").html(data.days);
        $(".CalendarPageLastText .calcData.wh").html(niceTime(data.wh));
        $(".CalendarPageLastText .calcData.standard-wh").html(niceTime(data.standard_wh));
        $(".CalendarPageLastText .calcData.diff").html(niceTime(data.diff)).addClass(data.diff<0?'red':'green').removeClass(data.diff>=0?'red':'green');
    };

    function BuildUI(){
        var wh_perDay=[8*60,9*60,9*60,9*60,9*60,0*60,0*60];
        var storageData=JSON.parse(localStorage.getItem('hilanCalc'));
        storageData=storageData?storageData:{};
        $("table#calendar_container>tbody>tr>td").each(function(){
            if(!/^[0-9:]*$/.test($(this).find(".cDM").html())) return;
            var calcDate=true;
            var standard_wh=wh_perDay[$(this).attr("days")%7-1];
            if($(this).hasClass("calendarPartAbcenseDay"))
                calcDate=false;
            if($(this).hasClass("cHD") && $(this).hasClass("cMAD")) standard_wh/=2;
            if(storageData[$(this).attr("days")]){
                if(typeof storageData[$(this).attr("days")].calcDate !== 'undefined') calcDate=storageData[$(this).attr("days")].calcDate;
                if(typeof storageData[$(this).attr("days")].standard_wh !== 'undefined') standard_wh=storageData[$(this).attr("days")].standard_wh;
            }
            $(this).find("td.imageContainerStyle").append('<span class="calc-dot '+(calcDate?'':'not-calc')+'" standard-wh="'+standard_wh+'" title="שעות תקן: '+niceTime(standard_wh)+'"></apsn>');
        })
        $("table#calendar_container").on("click",".calc-dot",function(event){
            $(this).toggleClass("not-calc");
            $(this).parents("table").parents("td").click();
            calcData();
            var storageData=JSON.parse(localStorage.getItem('hilanCalc'));
            storageData=storageData?storageData:{};
            if(!storageData[$(this).parents("table").parents("td").attr("days")]) storageData[$(this).parents("table").parents("td").attr("days")]={};
            storageData[$(this).parents("table").parents("td").attr("days")].calcDate=!$(this).hasClass("not-calc");
            localStorage.setItem('hilanCalc', JSON.stringify(storageData));
        })

        $(".CalendarPageLastText").append('<div class="calc">סה"כ ימי עבודה: <span class="calcData tootal-days"></span></div>');
        $(".CalendarPageLastText").append('<div class="calc">סה"כ שעות עבודה: <span class="calcData wh"></span></div>');
        $(".CalendarPageLastText").append('<div class="calc">סה"כ שעות תקן: <span class="calcData standard-wh"></span></div>');
        $(".CalendarPageLastText").append('<div class="calc">הפרש שעות: <span class="calcData diff"></span></div>');

    }

    function buildStyle(){
        GM_addStyle('.calc-dot {background-color: #2fc52f;height: 13px;width: 13px;border-radius: 50%;display: inline-block;float: left;}');
        GM_addStyle('.calc-dot.not-calc {background-color: #ff0000;');
        GM_addStyle('.calc {font-weight: normal');
        GM_addStyle('.calc .calcData {font-weight: bold');
        GM_addStyle('.calc .calcData.red {color: red');
        GM_addStyle('.calc .calcData.green {color: green');
    }

    function niceTime(num){
        return Math.floor(Math.floor(Math.abs(num/60)))+":"+("00"+Math.abs(num)%60).slice(-2);
    }

    buildStyle();
    setInterval(start, 1000);
    start();

})();