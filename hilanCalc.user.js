// ==UserScript==
// @name         hilanCalc
// @version      0.1
// @description  calculate monthly working hours
// @author       Daniel Erez
// @match        https://*.net.hilan.co.il/Hilannetv2/UIV2/main.aspx
// @grant        none
// ==/UserScript==

(function() {
    var intrval=null;
    $("iframe#mainIFrame").load(function(){
        clearInterval(intrval);
        if(!$(this).attr("src").includes("calendarpage")) return;
        var iframe = $(this).contents();

        function showData(){
            var wh_perDay=[8,9,9,9,9,0,0];

            var data={wh:0,standard_wh:0};
            iframe.find(".projectDay").each(function(){
                if(!/^[0-9:]*$/.test($(this).find(".cDM").html())) return;
                data.standard_wh+=wh_perDay[$(this).attr("days")%7-1];
                var arr=$(this).find(".cDM").html().split(":");
                data.wh+=parseInt(arr[0])+parseInt(arr[1])/60;
            })
            data.diff=data.wh-data.standard_wh;
            function niceTime(num){
                return Math.floor(Math.abs(num))+":"+("00"+Math.floor((Math.abs(num)-Math.floor(Math.abs(num)))*60)).slice(-2);
            }
            iframe.find(".CalendarPageLastText").append('<div class="calc">סה"כ שעות עבודה: <span class="calcData">'+niceTime(data.wh)+'</span></div>');
            iframe.find(".CalendarPageLastText").append('<div class="calc">סה"כ שעות תקן: <span class="calcData">'+niceTime(data.standard_wh)+'</span></div>');
            iframe.find(".CalendarPageLastText").append('<div class="calc">הפרש שעות: <span class="calcData '+(data.diff<0?'red':'green')+'">'+niceTime(data.diff)+'</span></div>');
            iframe.find(".calc").css("font-weight","normal");
            iframe.find(".calc .calcData").css("font-weight","bold");
            iframe.find(".calc .calcData.red").css("color","red");
            iframe.find(".calc .calcData.green").css("color","green");
        };

        showData();
        intrval=setInterval(function(){
            if(iframe.find(".calc").length==0)
                showData();
        }, 1000);
    });
})();