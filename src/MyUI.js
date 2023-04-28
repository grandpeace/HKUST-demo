export {MyUI}
class MyUI{
    constructor() {
        function Text(str,color,size,parentNode){//文本
            if (typeof(parentNode) == "undefined") parentNode = document.body;
            this.parentNode=parentNode;
            this.str=str;
            this.color=color;
            this.size=size;
            this.element=h1(str,color,size,parentNode);
            function h1(str,color,size,parentNode){
                var oText=document.createElement('h1');
                oText.innerHTML=str;
                oText.style.cssText=
                    //'color:skyblue;'+
                    'color:'+color+';'+//文字颜色
                    //'background:#aff;'+//背景颜色
                    'font-size:'+size+'px;'+//文字大小
                    //'width:60px;height:40px;'+//文本大小
                    'font-weight:normal;'+
                    //+'padding-top:50px;'//距离上一个对象的距离
                    'position:fixed;'+//到窗体的位置
                    'left:'+0+'px;'+//到部件左边距离
                    'top:'+0+'px;'; //到部件右边 距离
                parentNode.appendChild(oText);
                return oText;
            }
        }
        function Button(str,color1,color2,color3,font_size,radius,w,h,x,y,cb) {
            if(typeof (w)=="undefined")w=100;
            if(typeof (h)=="undefined")h=50;
            var parentNode = document.body;
            var num = Math.floor(w/font_size)
            var str0 = str.slice(0,num)
            this.element=p(str0,color1,color2,color3,font_size,radius,w,h,parentNode);
            function p(html,color1,color2,color3,font_size,radius,width,height,parentNode){
                var rgb2 = hex2rgb(color2)
                var oButton=document.createElement('p');//按钮
                oButton.innerHTML=html;
                oButton.style.cssText=
                    'font-family:Times New Roman;'
                    +'font-size:'+font_size+'px;'//字体大小
                    +'width:'+width+'px;height:'+height+'px;'//按钮大小
                    // +'background:'+color1+';'
                    +'background-color:rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0.6);'
                    +'color:white;'//按钮颜色
                    // +'opacity:0.8;'
                    +'vertical-align:middle;'
                    +'text-align:center;'
                    +'line-height:'+height+'px;'
                    +'border-radius: '+radius+'px;'
                    +'border: 1.5px solid '+color2+';'
                    +'position:fixed;'//到窗体的位置
                    +'left:'+(window.innerWidth-width)+'px;'//到部件左边距离
                    +'top:'+0+'px;'; //到部件右边 距离
                //+'cursor:pointer;'
                oButton.style.left=x+'px';
                oButton.style.top=y+'px';
                oButton.style.cursor='hand';
                oButton.onmouseover=function(){
                    oButton.style.cursor='hand';
                    oButton.style.backgroundColor = color3;
                    oButton.style.color = color2;
                }
                oButton.onmouseout=function(){
                    oButton.style.cursor='normal';
                    oButton.style.backgroundColor = 'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0.6)';
                    oButton.style.color = 'white';
                }
                oButton.onmousedown = function() {
                    oButton.style.backgroundColor = color2;
                    oButton.style.color = 'white';
                }
                oButton.onmouseup = function() {
                    oButton.style.backgroundColor = color3;
                    oButton.style.color = 'white';
                }
                parentNode.appendChild(oButton);
                if(cb)oButton.onclick=()=>{
                    cb(oButton)
                }
                return oButton;
            }
        }
        Button.prototype=Text.prototype={
            reStr:function(str){
                this.element.innerHTML=str;
            },
            rePos:function (x,y) {
                this.element.style.left=x+'px';
                this.element.style.top=y+'px';
            },
            addEvent:function(event){
                this.element.onclick=event;
            },
        }
        this.Button=Button
    }
}

const hex2rgb=hex=> [1,3,5].map((h)=>parseInt(hex.substring(h,h+2),16));
