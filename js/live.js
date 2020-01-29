// const urls must end with slash "/"
const webchan_url = "https://chan.qaq.link/";
const wss_url     = "wss://chan.qaq.link/websocket/";
const live_url    = "https://live.qaq.link/live/";
const live_root   = "https://live.qaq.link/";
const use_danmaku = true;


function show_not_ready_text() {
    $("#video").remove();
    $("#not_ready_text").text(roomid_decoded + " 未开播");
    $("#not_ready_text").css("position", "absolute");
    $("#not_ready_text").css("font-size", "xxx-large");
    $("#not_ready_text").css("color", "white");
    $("#not_ready_text").css("top", "40%");
    $("#not_ready_text").css("left", "50%");
    $("#not_ready_text").css("transform", "translate(-50%, -50%)");
    
}

function load_history() {
    let to_time = Math.floor(new Date().getTime() / 1000);
    let from_time = to_time - 8*60*60; // last 8 hours
    let query_url = webchan_url + roomid + "/" + from_time;
    $.get(query_url, function(data) {
        damoo_history += data;
        $("#damoo_history").val(damoo_history);
    });
}

let damoo = null;
let damoo_history = "";
let roomid = window.location.pathname.split("/")[1];
let roomid_decoded = decodeURI(roomid);

if (roomid == "") {
    // show top lives
    document.title = "QAQ Live";
    $.getJSON(webchan_url + "recent", function(data){
        let content = "<h3> Top Lives </h3>";
        content += "<table border=1 cellpadding=8 cellspacing=0>";
        content += "<tr> <th>直播间</th> <th>人气</th> <th>最近弹幕时间</th> </tr>";
        for(let i = 0; i<data.length; i++) {
            let recent = data[i];
            content += '<td><a href="/' + recent["Chan"] + '">' + recent["Chan"] + '</a></td>';
            content += '<td>' + recent["Act"]["Count"] + '</td>';
            content += '<td>' + $.timeago(recent["Act"]["LastTime"]*1000) + '</td>';
            content += '</tr>';
        }
        content += "</table>";
        $.getJSON(live_root + "_stat", function(data2){
            content += "<br><br><h3> All Lives </h3>";
            for(let j=0;j<data2["publishers"].length; j++) {
                let app_room = data2["publishers"][j]["key"];
                let room = app_room.split('/')[1];
                content += '<a href="/' + room + '"><h5>' + room + '</h5></a>';
            }
            $("body").html(content);
        });
    });
} else {
    // load history from webchan
    load_history();

    // setup title
    document.title = roomid_decoded +  " - QAQ Live";
    // setup video
    $("body").css("background-color", "black");
    $("#video_div").html('<video controls="controls" id="video" width="100%" height="100%"></video><div id="video_overlay"></div>');
    $("#video_overlay").css("position", "fixed");
    let video = document.getElementById('video');
    if (Hls.isSupported()) {
        let hls = new Hls();
        hls.loadSource(live_url + roomid + '.m3u8');
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            video.play();
        });
        hls.on(Hls.Events.ERROR, function () {
            show_not_ready_text();
        });
    }
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = live_url + roomid + '.m3u8';
        video.addEventListener('loadedmetadata', function () {
            video.play();
        });
        video.addEventListener('error', function () {
            show_not_ready_text();
        });
    }

    // setup damoo
    if (use_danmaku) {
        $.getScript("/js/danmaku.min.js").done(function(script, textStatus) {
            damoo = new Danmaku();
            damoo.init({
                container: document.getElementById('video_overlay'),
                engine: 'canvas',
                speed: 144
            });
        });
    } else {
        $.getScript("/js/damoo.min.js").done(function(script, textStatus) {
            damoo = new Damoo('video_overlay', 'dm-canvas', 26);
            damoo.play();
        });
    }

    // setup websocket
    let sock = null;
    let wsuri = wss_url + roomid;
    sock = new WebSocket(wsuri);
    sock.onmessage = function(e) {
        let msg = e.data.split('|').slice(1).join('|');
        console.log("[damoo] " + msg);
        damoo_history += msg;
        $("#damoo_history").val(damoo_history);
        if (use_danmaku) {
            damoo.emit({
                text: msg,
                html: "render",
                canvasStyle: {
                    font: '24px sans-serif',
                    fillStyle: 'white',
                    strokeStyle: 'white',
                    shadowColor: 'white',
                  },
            });
        } else {
            damoo.emit({text: msg, color: "white"});
        }
    };

    // setup default username
    let saved_username = window.localStorage.getItem("username");
    if (saved_username != null) {
        $(screenBulletUser).val(saved_username);
    }

    // setup event for send damoo
    $('#screenBulletText').on("keypress", function(event) {
        // enter has keyCode = 13, change it if you want to use another button
        if (event.keyCode == 13) {
            let username = $("#screenBulletUser").val();
            if (username == "") {
                alert("填写用户名");
                return false;
            }
            window.localStorage.setItem("username", username);
            let msg = username + ": " + $("#screenBulletText").val();
            $("#screenBulletText").val("");
            $.post(webchan_url + roomid, msg);
            return false;
        }
    });
}
