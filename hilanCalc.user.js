// ==UserScript==
// @name         hilanCalc
// @version      3.4.1
// @description  calculate monthly working hours
// @author       Daniel Erez
// @match        https://*.net.hilan.co.il/Hilannetv2/*
// @exclude      https://*.net.hilan.co.il/Hilannetv2/UIV2/main.aspx
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/locale/he.js
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @connect      10bis.co.il
// ==/UserScript==

/**********************************************

for start get telegram notification run in the console the follow line:
    localStorage.setItem('hilanCalc_telegram', JSON.stringify({bot_token:"**********",chat_id:"*********"}));
for generate bot token start chat with botFather:
    https://web.telegram.org/#/im?p=@BotFather
for get your chat_id ask chatIDrobot:
    https://web.telegram.org/#/im?p=@chatIDrobot

***********************************************/

(function() {

    function start(){
        if ($("#calendarPlace").length==0 || $(".calc").length) return;
        BuildUI();
        calcData();
        calc10bisData();
    }

    function calcData(){
        var month=moment($("#ctl00_mp_calendar_monthChanged").html(), 'MMMM YYYY', 'he');
        var isCurrentMonth=month.isSame(moment(), 'month');
        var data={wh:0,standard_wh:0, days:0};
        $("table#calendar_container>tbody>tr>td").each(function(){
            if(!$(this).has(".calc-dot").length) return;
            if($(this).has(".calc-dot.not-calc").length) return;
            data.standard_wh+=parseInt($(this).find(".calc-dot").attr("standard-wh"));
            var arr=$(this).find(".cDM").html().split(":");
            var dayTime=parseInt(arr[0])*60+parseInt(arr[1]);
            data.wh+=dayTime;
            data.days++;
        })
        data.diff=data.wh-data.standard_wh;
        $(".CalendarPageLastText .calcData.tootal-days").html(data.days);
        $(".CalendarPageLastText .calcData.wh").html(niceTime(data.wh));
        $(".CalendarPageLastText .calcData.standard-wh").html(niceTime(data.standard_wh));
        $(".CalendarPageLastText .calcData.diff").html(niceTime(data.diff)).addClass(data.diff<0?'red':'green').removeClass(data.diff>=0?'red':'green');

        if(isCurrentMonth){
            var updateText = `*עדכון נתוני חילן*\n`;
            updateText += `חודש: *${month.format('MMMM YYYY', 'he')}*\n`;
            updateText += `סה"כ ימי עבודה: *${data.days}*\n`;
            updateText += `סה"כ שעות עבודה: *${niceTime(data.wh)}*\n`;
            updateText += `סה"כ שעות תקן: *${niceTime(data.standard_wh)}*\n`;
            updateText += `הפרש שעות: *${niceTime(data.diff)}${data.diff<0?'🔻':'✅'}*\n`;
            sendUpdate("calcData",updateText)
        }
    };

    async function calc10bisData(){
        $(".loading-10bis").show();
        $(".calc10bisEstimate").hide();
        var month=moment($("#ctl00_mp_calendar_monthChanged").html(), 'MMMM YYYY', 'he');
        var isCurrentMonth=month.isSame(moment(), 'month');
        var data = await get10BisData(month);
        if (data==null){
            $(".loading-10bis").hide();
            $(".error-10bis").show();
            return;
        }
        data.days=0;
        data.estimateDays=0;
        data.todayIsWorkingDay=false;
        $("table#calendar_container>tbody>tr>td[days]").each(function(){
            var isToday= month.clone().date($(this).find(".dTS").text()).isSame(moment(), 'd')
            if($(this).find(".cDM").text()=="יום ע"){
                data.days++;
                data.estimateDays++;
                if (isToday) data.todayIsWorkingDay=true;
            }
            if($(this).find(".cDM").text()=="נכח"){
                data.estimateDays++;
                if (isToday) data.todayIsWorkingDay=true;
            }
            else if(/^[0-9:]*$/.test($(this).find(".cDM").html())){
                var arr=$(this).find(".cDM").html().split(":");
                if(parseInt(arr[0])>=6) {
                    data.days++;
                    data.estimateDays++;
                    if (isToday) data.todayIsWorkingDay=true;
                }
            }
            else if($(this).find(".cDM").text().trim()=="" && ($(this).attr("days")%7)<=5 && ($(this).attr("days")%7)>0){
                data.estimateDays++;
                if (isToday) data.todayIsWorkingDay=true;
            }
        })
        data.budget=data.days*37;
        data.diff=data.budget-data._10bis;

        data.estimateBudget=data.estimateDays*37;
        data.estimateDiff=data.estimateBudget-data._10bis;
        data.estimateDiffPerDay=data.estimateDiff/(data.estimateDays-data.days-(data.todayIsWorkingDay && (data.today>0 || moment().format("HH")>=17) ?1:0));
        $(".CalendarPageLastText .calcData.10bisuseCrdit").html(data.credit.toFixed(2)+"₪");
        $(".CalendarPageLastText .calcData.10bisuse10bis").html(data._10bis.toFixed(2)+"₪");
        $(".CalendarPageLastText .calcData.10bisBudget").html(data.budget.toFixed(2)+"₪");
        $(".CalendarPageLastText .calcData.10bisDff").html(data.diff.toFixed(2)+"₪").addClass(data.diff<0?'red':'green').removeClass(data.diff>=0?'red':'green');
        $(".CalendarPageLastText .calcData.10bisday").html(data.days);
        $(".CalendarPageLastText .calcData.10bistoday").html(data.today.toFixed(2)+"₪");
        if(data.estimateDays!=data.days){
            $(".calc10bisEstimate").show();
            $(".CalendarPageLastText .calcData.10bisBudgetEstimate").html(data.estimateBudget.toFixed(2)+"₪");
            $(".CalendarPageLastText .calcData.10bisDffEstimate").html(data.estimateDiff.toFixed(2)+"₪").addClass(data.estimateDiff<0?'red':'green').removeClass(data.estimateDiff>=0?'red':'green');
            $(".CalendarPageLastText .calcData.10bisdayEstimate").html(data.estimateDays);
            if(data.estimateDiffPerDay<=40)
                $(".calc-10bis-dot").addClass("good");
            else if (data.estimateDiffPerDay<=50)
                $(".calc-10bis-dot").addClass("medium");
            else
                $(".calc-10bis-dot").addClass("bad");
            if(data.estimateDiffPerDay !== Infinity){
                $(".calc-10bis-dot").attr("title","ממוצע ליום "+data.estimateDiffPerDay.toFixed(2));
            }
        }
        $(".loading-10bis").hide();
        $(".updated-10bis").show();

        if(isCurrentMonth){
            var updateText = `*עדכון נתוני תן ביס*\n`;
            updateText += `חודש: *${month.format('MMMM YYYY', 'he')}*\n`;
            updateText += `סה"כ תשלום באשראי: *${data.credit.toFixed(2)}₪*\n`;
            updateText += `סה"כ תשלום בתן-ביס: *${data._10bis.toFixed(2)}₪*\n`;
            updateText += `סה"כ תקציב תן ביס: *${data.budget.toFixed(2)}₪* (${data.estimateBudget.toFixed(2)}₪)\n`;
            updateText += `יתרה תן-ביס: *${data.diff.toFixed(2)}₪${data.diff<0?'🔻':'✅'}* (${data.estimateDiff.toFixed(2)}₪${data.estimateDiff<0?'🔻':'✅'} `;
            if(data.estimateDiffPerDay<=40) updateText += `💚`; // green
            else if (data.estimateDiffPerDay<=50) updateText += `💛`; // yellow
            else updateText += `❤️`;
            updateText += `)\n`;
            updateText += `ימי תן ביס: *${data.days}* (${data.estimateDays})\n`;
            updateText += `נוצל היום: *${data.today.toFixed(2)}₪*\n`;
            sendUpdate("10bis",updateText)
        }
    }

    function BuildUI(){
        var isCurrentMonth=moment($("#ctl00_mp_calendar_monthChanged").html(), 'MMMM YYYY', 'he').isSame(moment(), 'month');
        var wh_perDay=[8*60,9*60,9*60,9*60,9*60,0*60,0*60];
        var storageData=JSON.parse(localStorage.getItem('hilanCalc'));
        storageData=storageData?storageData:{};
        $("table#calendar_container>tbody>tr>td[days]").each(function(){
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

        $(".CalendarPageLastText").css("width","450px");
        $(".CalendarPageLastText").append('<div class="calc-10bis" style="float:left"></div>');
        $(".CalendarPageLastText").append('<div class="calc">סה"כ ימי עבודה: <span class="calcData tootal-days"></span></div>');
        $(".CalendarPageLastText").append('<div class="calc">סה"כ שעות עבודה: <span class="calcData wh"></span></div>');
        $(".CalendarPageLastText").append('<div class="calc">סה"כ שעות תקן: <span class="calcData standard-wh"></span></div>');
        $(".CalendarPageLastText").append('<div class="calc">הפרש שעות: <span class="calcData diff"></span></div>');
        $(".CalendarPageLastText .calc-10bis").append('<div class="calc" style="font-weight: bold;">נתוני תן-ביס <span class="loading-10bis">בטעינה</span><span class="error-10bis">שגיאה</span><span class="updated-10bis">מעודכן</span></div>');
        $(".CalendarPageLastText .calc-10bis").append('<div class="calc">סה"כ תשלום באשראי: <span class="calcData number 10bisuseCrdit"></span></div>');
        $(".CalendarPageLastText .calc-10bis").append('<div class="calc">סה"כ תשלום בתן-ביס: <span class="calcData number 10bisuse10bis"></span></div>');
        $(".CalendarPageLastText .calc-10bis").append('<div class="calc">סה"כ תקציב תן ביס: <span class="calcData number 10bisBudget"></span> <span class="calc10bisEstimate">(<span class="calcData number 10bisBudgetEstimate"></span>)</span</div>');
        $(".CalendarPageLastText .calc-10bis").append('<div class="calc">יתרה תן-ביס: <span class="calcData number 10bisDff"></span> <span class="calc10bisEstimate">(<span class="calcData number 10bisDffEstimate"></span><span class="calc-10bis-dot"></span>)</span></div>');
        $(".CalendarPageLastText .calc-10bis").append('<div class="calc">ימי תן ביס: <span class="calcData number 10bisday"></span> <span class="calc10bisEstimate">(<span class="calcData number 10bisdayEstimate"></span>)</span</div>');
        if (isCurrentMonth){
            $(".CalendarPageLastText .calc-10bis").append('<div class="calc">נוצל היום: <span class="calcData number 10bistoday"></span>');
        }

    }

    function buildStyle(){
        GM_addStyle('.calc-dot {background-color: #2fc52f;height: 13px;width: 13px;border-radius: 50%;display: inline-block;float: left;}');
        GM_addStyle('.calc-dot.not-calc {background-color: #ff0000;');
        GM_addStyle('.calc {font-weight: normal');
        GM_addStyle('.calc .calcData {font-weight: bold');
        GM_addStyle('.calc .calcData.red {color: red');
        GM_addStyle('.calc .calcData.green {color: green');
        GM_addStyle('.calc-10bis-dot {height: 13px; width: 13px; border-radius: 50%; display: inline-block; margin: 0px 2px;}');
        GM_addStyle('.calc-10bis-dot.good {background-color: #2fc52f;');
        GM_addStyle('.calc-10bis-dot.medium {background-color: #ebef18;');
        GM_addStyle('.calc-10bis-dot.bad {background-color: #ff0000;');
        GM_addStyle('.updated-10bis {color: #2fc52f; display:none');
        GM_addStyle('.loading-10bis {color: #d6d101; display:none');
        GM_addStyle('.error-10bis {color: #ff0000; display:none');
        GM_addStyle('.calcData.number {direction: ltr; display: inline-block;}');
    }

    function niceTime(num){
        return Math.floor(Math.floor(Math.abs(num/60)))+":"+("00"+Math.abs(num)%60).slice(-2);
    }

    buildStyle();
    setInterval(start, 1000);
    start();




    async function get10BisData(month){
        var data={
            credit:0,
            _10bis:0,
            today:0
        };
        var monthDiff=month.diff(moment().startOf('month'), 'months');
        if(monthDiff>0) return data;
        var res=await getRequest("https://www.10bis.co.il/Account/UserReport?dateBias="+monthDiff);
        res = res.replace(/<img .*?>/g,"");
        if($(res).find(".userReportDataTbl:eq(-1) tbody.userReportBody tr").length==0) return null;
        $(res).find(".userReportDataTbl:eq(-1) tbody.userReportBody tr").each(function(){
            var val=parseFloat($(this).find("td:eq(1)").text().trim().replace(/[^\d.-]/g, ''));
            switch($(this).find("td:eq(0)").text().trim()) {
                case "חיובים בכרטיסי תן ביס":
                    data._10bis=val;
                    break;
                case "חיובים בכרטיסי אשראי":
                    data.credit=val;
                    break;
            }
        })
        $(res).find(".userReportDataTbl tbody.userReportBody tr").each(function(){
            if($(this).find("td:nth-child(2)").html()===undefined) return;
            var time=moment($(this).find("td:nth-child(2)").html().trim(), 'DD/MM/YYYY', 'he');
            if (time.isSame(moment(), 'd')) {
                data.today+=parseFloat($(this).find("td:nth-child(6)").text().trim().replace(/[^\d.-]/g, ''));
            }
        })
        return data;
    }

    function getRequest(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest ( {
                method:     'GET',
                url:        url,
                onload:     function (responseDetails) {
                    if (responseDetails.status==200){
                        resolve(responseDetails.responseText);
                    }
                    else{
                        reject(responseDetails);
                    }
                }
            } );
        })
    }

    function sendUpdate(type,text){
        var data=JSON.parse(localStorage.getItem('hilanCalc_telegram'));
        if(!data) return;
        if(!data.last) data.last={};
        if(data.last && data.last[type]==text) return; // not update
        $.ajax({
            type: "POST",
            url: `https://api.telegram.org/bot${data.bot_token}/sendMessage`,
            data: {chat_id:data.chat_id,parse_mode:"Markdown",text:text},
            dataType: "json",
            success: ()=>{
                data.last[type]=text;
                localStorage.setItem('hilanCalc_telegram', JSON.stringify(data));
            }
        });
        if(type == "calcData") sendUpdateImage()
    }

    async function sendUpdateImage(){
        var data=JSON.parse(localStorage.getItem('hilanCalc_telegram'));
        var formData = new FormData();
        formData.append("chat_id", data.chat_id);
        formData.append("photo", await html2Blob("#calendar_container"));
        $.ajax({
            type: "POST",
            url: `https://api.telegram.org/bot${data.bot_token}/sendphoto`,
            data: formData,
            contentType: false,
            processData: false,
        });
    }

    async function html2Blob(selector){
        var canvas = await html2canvas($(selector)[0],{scale:2});
        var image = canvas.toDataURL();
        return (await fetch(image)).blob();
    }

})();
