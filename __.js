var __ = {
  config: {},
  routes: [],
  loaded: [],
  models: {},
  components: {},
  loading: 0,
  params: {},
  data: {},
  js: null,
  jss: {},  
  console: console,
  currentScript: document.currentScript,
  pageTitle:function(val, prepend){
    if(val){
      if(prepend){
        document.title = val + " - " +document.title;
      }else{
        document.title = val;
      }      
    }
    return document.title;
  },

  /*********************************************
      GET SCRIPT
      
      This is used to load external JS files
      onto the page.
  ******************************************** */
  getScript: function(url, cb) {
    var newScript = document.createElement("script");
    if (cb) {
      newScript.onerror = function() { cb(true, null) };
      newScript.onload = function() { cb(null, true) };
    }
    newScript.setAttribute("injected", true);
    this.currentScript.parentNode.insertBefore(newScript, this.currentScript);

    newScript.src = url + ((window.location.queryString("cachebuster") !== null) ? "?cachebuster=" + __.rndString(10, ["letters", "numbers"]) : "")
  },

  /*********************************************
      LOAD STYLE
      
      This is used to load css files
      onto the page.
  ******************************************** */
  loadStyle: function(url, cb) {
    var link = document.createElement("link");
    link.href = url + ((window.location.queryString("cachebuster") !== null) ? "?cachebuster=" + __.rndString(10, ["letters", "numbers"]) : "")
    link.rel = "stylesheet";
    link.setAttribute("injected", true);

    if (cb) {
      link.onerror = function() { cb(true, null) };
      link.onload = function() { cb(null, true) };
    }
    document.head.append(link);

  },

  appendStyle: function(content) {
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = content;
    document.head.appendChild(style);
  },

  appendScript: function(content) {
    var script = document.createElement('script');
    script.innerHTML = content;
    document.head.appendChild(script);
  },

  appendLink: function(href, rel) {
    var script = document.createElement('link');
    script.rel = ((rel) ? rel :"manifest");
    script.href = href;
    document.head.appendChild(script);
  },

  /*********************************************
      GET CONTENT

      Get content from an html page or text src
  ******************************************** */
  getContent: function(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {   // XMLHttpRequest.DONE == 4          
        cb(xhr.responseText, xhr.status);
      }
    };

    xhr.open("GET", url + ((window.location.queryString("cachebuster") !== null) ? "?cachebuster=" + __.rndString(10, ["letters", "numbers"]) : ""), true);
    xhr.send();
  },

  /*********************************************
      LOAD

      Loads up local js file that are used by
      your app like models or shared scripts.
  ******************************************** */
  load: function(files, cb, reload) {
    if (reload) {
      __.loaded = [];
    }

    var loading = 0;
    if (typeof files === "string") { files = [files]; }
    if (files) {
      loading += files.length;

      files.forEach(function(file) {
        if (file && file.length > 0 && __.loaded.indexOf(file) === -1) {
          __.getScript(((typeof __.config !== "undefined" && typeof __.config.origin !== "undefined") ? __.config.origin : window.location.origin) + file + ((__.config.use_min) ? __.config.use_min : "") + ((file.indexOf(".js")===-1) ? ".js" : "") , function() {
            __.loaded.push(file);
            loading--;
            if (loading <= 0) {
              if (cb) { cb(); }
            }
          });
        } else {
          loading--;
          if (loading <= 0) {
            if (cb) { cb(); }
          }
        }
      })
    }
  },

  unload:function(file){
    if(__.loaded && __.loaded.indexOf(file)>-1){
      __.loaded.splice(__.loaded.indexOf(file), 1);
    }
  },

  /*********************************************
      CALL API
      p 
        - method: POST | GET | etc..
        - data: JSON object
        - headers: JSON object
        - response: callback accepting three parameters.
            -First is an error object
            -Second is the response JSON or text from the api
            -Third just the http status number
  ******************************************** */
  callAPI: function(url, p) {
    var request = new XMLHttpRequest();
    request.open(((p.method) ? p.method : "GET"), ((url.indexOf("http") === -1) ? this.config.base_api_url : "") + url, true);
    request.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
    if (p.headers) {
      Object.keys(p.headers).forEach(function(key) {
        request.setRequestHeader(key, p.headers[key]);
      });
    }
    request.onload = function() {
      if (this.status === 200) {
        var responseObject = this.response;
        try {
          if (this.response.length) {
            responseObject = JSON.parse(this.response);
          }
        } catch (e) {

        }
        p.response(null, responseObject, this.status);
      } else {
        try {
          p.response(JSON.parse(this.response), null, this.status);
        } catch (e) {
          if(typeof this.response==="string" && this.response.length>0){
            p.response(this.response, null, this.status);
          }else{
            p.response(true, null, this.status);
          }          
        }

      }
    };
    request.onerror = function(e) {
      p.response({ "error": this.statusText, "details": this.response.trim() }, null, this.status);
    };
    request.ontimeout = function(e) {
      p.response("timeout", null, this.status);
    };
    request.onabort = function(e) {
      p.response("abort", null, this.status);
    };
    request.send(((p.data) ? JSON.stringify(p.data) : null));
  },

  /*********************************************
      ROUTER

      Allows you to define your apps pages
      and their handlers similar to express but not as flushed out
  ******************************************** */
  router: function(registerEventListener, silent, cb) {
    if (registerEventListener) { window.addEventListener('popstate', __.router); }
    var allRoutes = __.routes.slice();
    var location = ((window.location.pathname[[window.location.pathname.length - 1]] === "/") ? window.location.pathname.substr(0, window.location.pathname.length - 1) : window.location.pathname);

    function processRoute(parameters = {}) {
      if (allRoutes.length > 0) {
        var route = allRoutes.shift();
        var routeRegex = "^";
        var routeParts = route[0].substr(1).split("/");
        //var parameters = {};

        routeParts.forEach(function(p, i) {
          if (p.indexOf(":") === 0) {
            //parameters[p.substr(1)] = location.substr(1).split("/")[i];
            routeRegex += '\\/?.*';
          } else {
            routeRegex += '\\/' + p;
          }
        });

        
        if (RegExp(routeRegex).test(location)) {  // && (location.substr(1).split("/").length <= routeParts.length)       
          routeParts.forEach(function(p, i) {
            if (p.indexOf(":") === 0) {
              parameters[p.substr(1)] = location.substr(1).split("/")[i];          
            }
          });
          
          window.location.search.substr(1).split("&").forEach(function(qs) {
            if (qs && qs.indexOf("=") > 0) {
              parameters[qs.split("=")[0]] = qs.split("=")[1];
            }
          });

          if (silent) {
            __.params = parameters;
          } else {
            route[1](parameters, function(parameters) { processRoute(parameters); });
          }
        } else {
          processRoute(parameters);
        }

      }
    }

    processRoute();
  },

  /*********************************************
      ROUTE TO
      Allows you to redirect the user to either
      a local or external url.
      - includeQS bool to inlude the querystring params with the redirect or not.
  ******************************************** */
  routeTo: function(url, params) {
    if (url.indexOf("http") === 0) {
      url = url + ((params && params.qs) ? window.location.search : "");
      if (params && params.ext_newtab) {
        window.open(url, '_blank');
      } else {
        window.location = url;
      }
    } else {
      window.history.pushState('', '', url + ((params && params.qs) ? window.location.search : ""));
      this.router();
    }
  },

  /*********************************************
      UPDATE LOCATION BAR
      - Just a wrapper of window.history.pushstate
  ******************************************** */
  updateLocationBar: function(url, includeQS) {
    window.history.pushState('', '', url + ((includeQS) ? window.location.search : ""));
  },


  /*********************************************
      APPEND TO LOCATION
      - Silently update the location bar address
  ******************************************** */
  appendToLocation: function(val, includeQS) {
    window.history.pushState('', '', ((window.location.pathname.substr(window.location.pathname.length - 1) === "/") ? window.location.pathname.substr(0, window.location.pathname.length - 1) : window.location.pathname) + val + ((includeQS) ? window.location.search : ""));
  },

  /*********************************************
      RENDER SCREEN
  ******************************************** */
  renderScreen: function(screenId, p = {}) {
    if (!screenId) { screenId = window.location.pathname; }
    __.params = p;
    __.getContent(((typeof __.config !== "undefined" && typeof __.config.origin !== "undefined") ? __.config.origin : window.location.origin) + "/screens/" + screenId + "/" + "ui" + ((__.config.use_min) ? __.config.use_min : "") + ".html", (html) => {
      document.getElementById(((typeof __.config.screenDOMId !== "undefined") ? __.config.screenDOMId : "__screen")).innerHTML = html;
      __.getScript(((typeof __.config !== "undefined" && typeof __.config.origin !== "undefined") ? __.config.origin : window.location.origin) + "/screens/" + screenId + "/" + "logic" + ((__.config.use_min) ? __.config.use_min : "") + ".js");
    });
  },

  /*********************************************
      PROCESS TEMPLATE
      A simple template parser. Use HandlebarsJS if you need anything more
  ******************************************** */

  processTemplate: function(html, data) {
    Object.keys(data).forEach(function(k) {
      var regex = new RegExp("{{" + k + "}}", "g");
      html = html.replace(regex, eval("data." + k));
    });
    return html;
  },

  /*********************************************
      LOAD COMPONENT
  ******************************************** */
  loadComponent_0: function(componentPath, componentId , domId, params, cb) {
    var that = this;
    //var componentId = componentPath.replace(/\//g, "_").toLowerCase();

    this.components[componentId] = { "params": params };
    this.getContent(((typeof __.config !== "undefined" && typeof __.config.origin !== "undefined") ? __.config.origin : window.location.origin) + "/components/" + componentPath.toLowerCase() + "/ui" + ((__.config.use_min) ? __.config.use_min : "") + ".html", function(html) {

      if (document.getElementById(domId)) {
        document.getElementById(domId).innerHTML = html;
        that.getScript(((typeof __.config !== "undefined" && typeof __.config.origin !== "undefined") ? __.config.origin : window.location.origin) + "/components/" + componentPath.toLowerCase() + "/logic" + ((__.config.use_min) ? __.config.use_min : "") + ".js", function() {
            if (typeof __.components[componentId.toLowerCase()].js.onLoad !== "undefined") {
              __.components[componentId.toLowerCase()].js.onLoad(cb);
            }else if(typeof cb==="function"){
              cb();
            }          
        });
      } else {
        console.error("DOM Element Does Not Exist", domId);
      }


    });
  },

  loadComponent: function(componentPath, cb) {
    var componentId = componentPath.replace(/\//g, "_").toLowerCase();

    __.components[componentId] = {ui:""};
    __.getContent(((typeof __.config !== "undefined" && typeof __.config.origin !== "undefined") ? __.config.origin : window.location.origin) + "/components/" + componentPath.toLowerCase() + "/ui" + ((__.config.use_min) ? __.config.use_min : "") + ".html", function(html) {
      
      __.components[componentId].ui = html;
      __.getScript(((typeof __.config !== "undefined" && typeof __.config.origin !== "undefined") ? __.config.origin : window.location.origin) + "/components/" + componentPath.toLowerCase() + "/logic" + ((__.config.use_min) ? __.config.use_min : "") + ".js", function() {
          if(typeof cb==="function"){ cb(); }          
      });
      

    });
  },

  /*********************************************
      RENDER LAYOUT
  ******************************************** */
  currentLayout:"",
  renderLayout: function(layout, cb) {
    if(this.currentLayout===layout){
      if (typeof cb === "function") { cb(true); }
    }else{
      this.currentLayout=layout;
      this.getContent(((typeof __.config !== "undefined" && typeof __.config.origin !== "undefined") ? __.config.origin : window.location.origin) + "/layouts/" + layout.toLowerCase() + ((__.config.use_min) ? __.config.use_min : "") + ".html", function(html) {
        if (document.getElementById("__layout")) {
          document.getElementById("__layout").innerHTML = html;
        } else {
          document.body.innerHTML = html;
        }
        if (typeof cb === "function") { cb(); }
      });
    }

    
  },

  shared: function(obj) {
    __.jss = Object.assign(__.jss, obj);
  },

  assign: function(obj) {
    __.js = Object.assign(__.js, obj);
  },

  component:function(componentId, instanceId, params,  cb){
    let obj={};
    obj[instanceId] = Object.assign({}, __.components[componentId].js);
    if(typeof __.js.component!=="object"){
      __.js.component={};
    }
    __.js.component = Object.assign(__.js.component, obj);
    if (typeof __.js.component[instanceId].autoLoad == "function") {
      __.js.component[instanceId].autoLoad(params, cb);
    }else if(typeof cb==="function"){
      cb();
    }
  },

  /*********************************************
      FORM VALIDATOR
  ******************************************** */
  validateFormData: function(id) {
    els = document.querySelectorAll("#" + id + " input, #" + id + " select, #" + id + " textarea, #" + id + " range");

    var isInvalid = false;
    function invalidFieldClass() { return ((__.config["invalid_field_class"]) ? __.config["invalid_field_class"] : "__is-invalid"); }

    __.$.addClass(".__fem", "__hide");
    
    els.forEach(function(el) {
      el.classList.remove(invalidFieldClass());
      if (el.getAttribute("required") !== null || el.getAttribute("required") === "required") {
        if (el.value.trim().length === 0) {
          el.classList.add(invalidFieldClass());
          isInvalid = true;
        } else {
          let regex = /./ig;
          let str = el.value.trim();

          switch (el.type) {
            case "email":
              regex = /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/ig;
              break;
            case "tel":
              str = str.replace(/[^0-9]/g, "");
              regex = /[0-9]{10}/;
              break;
            case "number":
              if ((el.getAttribute("min") !== null && Number(str) < Number(el.getAttribute("min"))) || (el.getAttribute("max") !== null && Number(str) > Number(el.getAttribute("max")))) {
                el.classList.add(invalidFieldClass());
                isInvalid = true;
              }
              break;
            case "checkbox":
              
            break;
          }

          if (regex) {
            if (!regex.test(str)) {
              el.classList.add(invalidFieldClass());
              isInvalid = true;
            }
          }
        }
      }

      if(el.getAttribute("min") && el.value.trim().length>0){
        switch (el.type) {
          case "date":
          case "datetime":            
            if(new Date(el.getAttribute("min")) > new Date(el.value.trim())){
              isInvalid = true;
              el.classList.add(invalidFieldClass());
            }
          break;
        }
      }

    });

    return !isInvalid;
  },

  /*********************************************
      FORM FIELD
  *********************************************/
  validateFormField: function(ids) {

    var isInvalid = false;

    function invalidFieldClass() { return ((__.config["invalid_field_class"]) ? __.config["invalid_field_class"] : "__is-invalid"); }

    if (typeof ids === "string") {
      ids = [ids];
    }

    ids.forEach(function(id) {
      el = document.getElementById(id);
      el.classList.remove(invalidFieldClass());

      if (el.getAttribute("required") !== null || el.getAttribute("required") === "required") {
        if (el.value.trim().length === 0) {
          el.classList.add(invalidFieldClass());
          isInvalid = true;
        } else if (el.type === "text" && (el.getAttribute("min") !== null || el.getAttribute("max") !== null)) {

          if (el.getAttribute("min") !== null && el.value.trim().length < Number(el.getAttribute("min"))) {
            el.classList.add(invalidFieldClass());
            isInvalid = true;
          }

          if (el.getAttribute("max") !== null && el.value.trim().length > Number(el.getAttribute("max"))) {
            el.classList.add(invalidFieldClass());
            isInvalid = true;
          }


        } else {
          let regex = /./ig;
          let str = el.value.trim();

          switch (el.type) {
            case "email":
              regex = /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/ig;
              break;
            case "tel":
              str = str.replace(/[^0-9]/g, "");
              regex = /[0-9]{10}/;
              break;
            case "number":
              if ((el.getAttribute("min") !== null && Number(str) < Number(el.getAttribute("min"))) || (el.getAttribute("max") !== null && Number(str) > Number(el.getAttribute("max")))) {
                el.classList.add(invalidFieldClass());
                isInvalid = true;
              }
              break;
          }

          if (regex) {
            if (!regex.test(str)) {
              el.classList.add(invalidFieldClass());
              isInvalid = true;
            }
          }
        }
      }

    });



    return !isInvalid;
  },


  /*********************************************
      GET FORM FILE
  ******************************************** */
  getFormFile: function(el, cb) {

    let file = el.files[0];
    let fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    fileReader.onload = function() {
      cb(null, fileReader.result);
    };
    fileReader.onerror = function() {
      cb(fileReader.error, null);
    };

  },


  /*********************************************
      GET FORM DATA
  ******************************************** */
  getFormData: function(id) {
    var dtr = {};
    document.querySelectorAll("#" + id + " input, #" + id + " select, #" + id + " textarea, #" + id + " range").forEach(async function(el) {
      //el.value = el.value.trim();     
      if (el.getAttribute("type") === "file") {
        dtr[el.name] = el;       
        
      } else if ((el.getAttribute("type") !== "checkbox" && el.getAttribute("type") !== "radio") || (el.getAttribute("type") === "checkbox" && el.checked) || (el.getAttribute("type") === "radio" && el.checked)) {
        if (typeof dtr[el.name] === "undefined") {
          
          if (el.getAttribute("storeas") === "array") {
            dtr[el.name] = [el.value];
          } else if (el.getAttribute("storeas") === "number") {
            dtr[el.name] = Number([el.value]);
          } else if (el.getAttribute("storeas") === "string") {
            dtr[el.name] = [el.value].toString();
          } else if (el.getAttribute("storeas") === "bool") {
            if (el.value === "") {
              dtr[el.name] = null;
            } else {
              dtr[el.name] = (["true", "yes"].indexOf(el.value.toString().toLowerCase()) > -1) || (Number(el.value) === 1) || (el.value === true);
            }
          } else if (el.getAttribute("storeas") === "group") {

            if (el.name.indexOf("|") > 0) {
              let groupData = el.name.split("|");
              if (typeof dtr[groupData[0]] === "undefined") {
                dtr[groupData[0]] = {};
              }
              dtr[groupData[0]][groupData[1]] = ((el.type === "number") ? Number(el.value) : el.value);
            }

          } else if (el.type === "datetime-local") {
            if (el.value) {
              dtr[el.name] = new Date(el.value).toString();
            }
          } else if (el.type === "number") {
            if (el.value) {
              dtr[el.name] = Number(el.value);
            }
          }else if(el.type === "select-multiple"){            
            dtr[el.name] =$(el).val();
          }else {
            dtr[el.name] = el.value;
          }

        } else if (typeof dtr[el.name] === "object") {
          dtr[el.name].push(el.value);

        } else {
          dtr[el.name] = [dtr[el.name], el.value];
        }
      }


    });


    return dtr;
  },

  /*********************************************
      SET FORM DATA
  ******************************************** */
  setFormData: function(formId, data) {
    Object.keys(data).forEach(function(key) {

      document.querySelectorAll('#' + formId + ' [name="' + key + '"]').forEach(function(el) {
        switch (el.type) {
          case "checkbox":
          case "radio":
            if (data[key] === el.value) {
              el.checked = "checked";
            } else if (el.getAttribute("storeas") === "bool") {
              var fieldValue = (["true", "yes"].indexOf(el.value.toString().toLowerCase()) > -1) || (Number(el.value) === 1) || (el.value === true);
              if (data[key] === fieldValue) {
                el.checked = "checked";
              }
            }
            break;
          case "date":
            el.value = ((data[key]) ? data[key].split("T")[0] : "");
            break;
          default:
            el.value = data[key];
            break;
        }
      });

    });

  },

  /*********************************************
    2 WAY BIND
    - https://www.atmosera.com/blog/data-binding-pure-javascript/
    - https://jsfiddle.net/v5owbwf0/4/
******************************************** */
  dataBind: function(b) {
    _this = this
    this.elementBindings = []
    this.value = b.object[b.property]
    this.valueGetter = function(){
        return _this.value;
    }
    this.valueSetter = function(val){
        _this.value = val
        for (var i = 0; i < _this.elementBindings.length; i++) {
            var binding=_this.elementBindings[i]
            binding.element[binding.attribute] = val
        }
    }
    this.addBinding = function(element, attribute, event){
        var binding = {
            element: element,
            attribute: attribute
        }
        if (event){
            element.addEventListener(event, function(event){
                _this.valueSetter(element[attribute]);
            })
            binding.event = event
        }       
        this.elementBindings.push(binding)
        element[attribute] = _this.value
        return _this
    }

    Object.defineProperty(b.object, b.property, {
        get: this.valueGetter,
        set: this.valueSetter
    }); 

    b.object[b.property] = this.value;
},

  /*********************************************
      STORAGE
  ******************************************** */
  storage: {
    data:{},
    set: function(key, data) {
      window.localStorage.setItem(key, ((typeof data === "object") ? JSON.stringify(data) : data));
    },
    get: function(key) {
      let data = window.localStorage.getItem(key);
      try {
        data = JSON.parse(data);
      } catch (e) { }
      return data;
    },
    exists: function(key) {
      return ((window.localStorage.getItem(key)) ? true : false);
    },
    delete: function(key) {
      window.localStorage.removeItem(key);

    },
    clear: function() {
      window.localStorage.clear();
    }
  },

  /*********************************************
      RANDOM STRING
  ******************************************** */
  rndString: function(len, params) {
    if (!len) { len = 5; }
    var text = "", possible = "";
    if (!params) {
      params = ["letters", "uppercase", "numbers", "specials", "safespecials"];
    }

    if (params.indexOf("letters") > -1) { possible += "abcdefghijklmnopqrstuvwxyz"; }
    if (params.indexOf("uppercase") > -1) { possible += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; }
    if (params.indexOf("numbers") > -1) { possible += "0123456789"; }
    if (params.indexOf("specials") > -1) { possible += '!@#$%^&*()-_+=[]{}?'; }
    if (params.indexOf("safespecials") > -1) { possible += '!*-_'; }
    if (params.indexOf("dashs") > -1) { possible += '-_'; }
    if (params.indexOf("exclude_confusing") > -1) { possible = possible.replace(/[o0il1]/ig, ""); }

    for (var i = 0; i < len; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  },

  /*********************************************
      RANDOM NUMBER
  ******************************************** */
  rndNumber: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  },

  /*********************************************
      GET COOKIE
  ******************************************** */
  getCookie: function(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
  },

  /*********************************************
      UUIDV4 - GUID generator
  ******************************************** */
  uuidv4: function() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  },

  /*********************************************
      Resize Image
  *********************************************/
  resizeImage: function(imageFile, params, cb){    
    if(typeof params==="number"){
      params={
        "w":params,
        "h":params
      }
    }

    let reader = new FileReader();
    reader.onload = function (e) {
        let img = document.createElement("img");
        img.onload = function (event) {
            // Dynamically create a canvas element
            let canvas = document.createElement("canvas");
            
            let ctx = canvas.getContext("2d");
        
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > params.w) {
                    height = height * (params.w / width);
                    width = params.w;
                }
            } else {
                if (height > params.h) {
                    width = width * (params.h / height);
                    height = params.h;
                }
            }

            canvas.width = params.w;
            canvas.height = params.h;

            ctx.clearRect(0, 0, canvas.width,canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,1)';
            ctx.fillRect(0,0,canvas.width,canvas.height);
                
            ctx.drawImage(img, (params.w-width)/2, (params.h-height)/2, width, height);            
            let dataurl = canvas.toDataURL(imageFile.type);                   
            cb(imageFile.name,imageFile.type,dataurl);

        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(imageFile);

  },


/*********************************************
  FILE TO BASE64 
*********************************************/
  fileToBase64:function(file, cb){
    let reader = new FileReader();
    reader.onload = function (e) {
      if(e.target.result.split("base64,")[1]){
        cb(file.name, file.type, file.size, e.target.result.split("base64,")[1].trim())
      }else{
        cb();
      }
    }

    reader.readAsDataURL(file);
  },

  fileToBase64Sync:function(file){
    return new Promise(function(resolve, reject){
      let reader = new FileReader();
      reader.onload = function (e) {
        if(e.target.result.split("base64,")[1]){
          resolve({"name":file.name, "type":file.type, "size":file.size, "content":e.target.result.split("base64,")[1].trim()})
        }else{
          reject(null);
        }
      }

      reader.readAsDataURL(file);
    })
    
  },
  /*********************************************
      UI 
      Display loading icons
  ******************************************** */
  ui: {
    loading: {
      dim: function(hide) {
        if (hide) {
          if (document.getElementById("__-dim")) {
            document.body.removeChild(document.getElementById("__-dim"));
          }
        } else if (!document.getElementById("__-dim")) {
          var dimDiv = document.createElement('div');
          dimDiv.style.cssText = "width:100%; height:100%; position:fixed; top:0; left:0; background: rgba(0,0,0,0.5); z-index:999999;";
          dimDiv.id = "__-dim"
          document.body.appendChild(dimDiv);
        }
      },
      body: function(hide) {
        this.dim(hide);
        if (hide) {
          if (document.getElementById("bodySpinner")) {
            document.body.removeChild(document.getElementById("bodySpinner"));
          }
        } else if (!document.getElementById("bodySpinner")) {
          var spinnerDiv = document.createElement('div');
          spinnerDiv.style.cssText = "position:fixed; top:30%; left:0; width:100%; text-align:center; z-index:99999999;";
          spinnerDiv.innerHTML = '<div class="spinner spinner-big" style="margin:0 auto;"></div>';
          spinnerDiv.id = "bodySpinner"
          document.body.appendChild(spinnerDiv);
        }

      },
      screen: function(hide) {
        this.dim(hide);
        this.section(((typeof __.config.screenDOMId !== "undefined") ? __.config.screenDOMId : "screen"), hide);
      },
      button: function(id, hide) {
        if (document.getElementById(id)) {
          if (hide) {
            if (document.getElementById(id + "Spinner")) {
              document.getElementById(id).removeChild(document.getElementById(id + "Spinner"));
            }
            document.getElementById(id).disabled = false;
          } else {
            document.getElementById(id).disabled = true;
            document.getElementById(id).innerHTML = '<div id="' + id + 'Spinner" class="spinner mr-1"></div> ' + document.getElementById(id).innerHTML;
          }
        }
      },
      section: function(id, hide) {
        if (document.getElementById(id)) {
          if (hide) {
            if (document.getElementById(id + "Spinner")) {
              document.getElementById(id).removeChild(document.getElementById(id + "Spinner"));
            }
          } else {
            document.getElementById(id).innerHTML = document.getElementById(id).innerHTML + '<div id="' + id + 'Spinner" style="position:absolute; top:30%; left:0; width:100%; text-align:center; z-index:99999999;"><div class="spinner spinner-big" style="margin:0 auto;"></div></div>';
          }
        }
      }
    },

    state: {
      get: function() { },
      get: function() { }
    },    
  },

  /*********************************************
      Jquery-like helpers
    ******************************************** */
      $: {
        prependHtml: function(el, html) { if (document.getElementById(el)) { document.getElementById(el).innerHTML = html + document.getElementById(el).innerHTML; } },
        appendHtml: function(el, html) { if (document.getElementById(el)) { document.getElementById(el).innerHTML += html; } },
        setHtml: function(el, html) { if (document.getElementById(el)) { document.getElementById(el).innerHTML = html; } },
        getHtml: function(el, html) { if (document.getElementById(el)) { return document.getElementById(el).innerHTML } else { return ""; } },
        addClass: function(selector, className) {
          for (let el of document.querySelectorAll(selector)) {
            if (!el.classList.contains(className)) {
              el.classList.add(className);
            }
          }
        },
        removeClass: function(selector, className) {
          for (let el of document.querySelectorAll(selector)) {
            if (el.classList.contains(className)) {
              el.classList.remove(className);
            }
          }
        },
  
        setAttribute: function(selector, attrName, attrValue) {
          for (let el of document.querySelectorAll(selector)) {
            el.setAttribute(attrName, attrValue);
          }
        },
  
        removeAttribute: function(selector, attrName) {
          for (let el of document.querySelectorAll(selector)) {
            el.removeAttribute(attrName);
          }
        },
  
        check: function(selector) {
          for (let el of document.querySelectorAll(selector)) {
            el.checked = true;
          }
        },
  
        uncheck: function(selector) {
          for (let el of document.querySelectorAll(selector)) {
            el.checked = false;
          }
        },
  
        removeElement: function(selector) {
          document.querySelectorAll(selector).forEach(function(a) {
            a.remove()
          })
        },
  
        autopopulate:function(id, val){
          let el = document.getElementById(id);
          if(el && el.value==="" && val!==""){
            el.value = val;
            return true;
          }else{
            return false;
          }
        }
      },

  /******************************************
   * AUTO COMPLETE
   * __.autocomplete.apply("myInput2", countries);
   * __.autocomplete.apply("myInput", operators, {"label":"label", "value":"id"});
   ******************************************/
  autocomplete:{
    listener:false,
    apply:function (id, arr, keys) {
      let inp = document.getElementById(id);

      let newElement = document.createElement('input');
        newElement.type="hidden";
        newElement.id=id+"_autocomplete";
        newElement.name=id+"_autocomplete";

      inp.parentNode.insertBefore(newElement, inp.nextSibling);

      /*the autocomplete function takes two arguments,
      the text field element and an array of possible autocompleted values:*/
      var currentFocus;
      /*execute a function when someone writes in the text field:*/
      inp.addEventListener("input", function(e) {
          var a, b, i, val = this.value;
          /*close any already open lists of autocompleted values*/
          closeAllLists();
          if (!val) { return false;}
          currentFocus = -1;
          /*create a DIV element that will contain the items (values):*/
          a = document.createElement("DIV");
          a.setAttribute("id", this.id + "__autocomplete-list");
          a.setAttribute("class", "__autocomplete-items");
          /*append the DIV element as a child of the autocomplete container:*/
          this.parentNode.appendChild(a);
          /*for each item in the array...*/
          
          arr.forEach(function(item, itemIndex){
            let itemLabel=item;
            if(typeof item==="object"){
              itemLabel=item[keys.label];
            }
            if (itemLabel.substr(0, val.length).toUpperCase() == val.toUpperCase()) {
               /*create a DIV element for each matching element:*/
               b = document.createElement("DIV");
               /*make the matching letters bold:*/
               b.innerHTML = "<strong>" + itemLabel.substr(0, val.length) + "</strong>";
               b.innerHTML += itemLabel.substr(val.length);
               /*insert a input field that will hold the current array item's value:*/
               b.innerHTML += "<input type='hidden' value='" + itemLabel + "'>";               
               /*execute a function when someone clicks on the item value (DIV element):*/
               b.addEventListener("click", function(e) {
                   /*insert the value for the autocomplete text field:*/
                   inp.value = this.getElementsByTagName("input")[0].value;
                   let selectedValue = inp.value;
                   if(typeof arr[itemIndex]==="object"){
                    selectedValue=arr[itemIndex][keys.value];
                   }
                   document.getElementById(id+"_autocomplete").value=selectedValue;
                   /*close the list of autocompleted values,
                   (or any other open lists of autocompleted values:*/
                   closeAllLists();
               });
               a.appendChild(b);
            }

          })
         
      });
     
      
      /*execute a function presses a key on the keyboard:*/
      inp.addEventListener("keydown", function(e) {
          var x = document.getElementById(this.id + "__autocomplete-list");
          if (x) x = x.getElementsByTagName("div");
          if (e.keyCode == 40) {
            /*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
            currentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
          } else if (e.keyCode == 38) { //up
            /*If the arrow UP key is pressed,
            decrease the currentFocus variable:*/
            currentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
          } else if (e.keyCode == 13) {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            e.preventDefault();
            if (currentFocus > -1) {
              /*and simulate a click on the "active" item:*/
              if (x) x[currentFocus].click();
            }
          }
      });
      function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "__autocomplete-active":*/
        x[currentFocus].classList.add("__autocomplete-active");
      }

      function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (var i = 0; i < x.length; i++) {
          x[i].classList.remove("__autocomplete-active");
        }
      }
      
      function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document,
        except the one passed as an argument:*/
        var x = document.getElementsByClassName("__autocomplete-items");
        for (var i = 0; i < x.length; i++) {
          if (elmnt != x[i] && elmnt != inp) {
            x[i].parentNode.removeChild(x[i]);
          }
        }
      }
      /*execute a function when someone clicks in the document:*/
      if(!__.autocomplete.listener){
        __.autocomplete.listener=true;
        document.addEventListener("click", function (e) {
          console.log("once");
          closeAllLists(e.target);
        });
      }
      
    }
  },

  /*********************************************
        A simple toast UI element that displays for 3 seconds
        m = message
        c = style class
        cb = callback once complete,
        to = timeout
  ******************************************** */
  toast:function(m, c, to, cb) {

    const ID="__toast"+Math.random().toString().split(".")[1]

    if (document.getElementById(ID)) {
      document.getElementById(ID).parentNode.removeChild(document.getElementById(ID));
    }
  
    document.body.insertAdjacentHTML("beforeend", '<div id="'+ID+'" class="__toast">' + m.toString() + '</div>');
  
    if (!c) {
      c = "__toast showToast"+((to) ? to : "");
    } else {
      c += " __toast showToast"+((to) ? to : "");
    }
  
    document.getElementById(ID).className = c;
    
    setTimeout(function() {
      if (document.getElementById(ID)) {
        document.getElementById(ID).className = document.getElementById(ID).className.replace("showToast", "");      
        if (typeof cb === "function") { cb(); }
      }
    }, ((to) ? (to+.4) * 1000 : 3000));
  },

/*****************************************************
 * COLLECTION TO ARRAY
 ****************************************************/
  collectionToArray:function(collection, cols){
    let row=[], output=[];
    collection.forEach(function(obj){
      row=[];
      cols.forEach(function(col){
        row.push(obj[col]);
      });
      output.push(row);
    });
    return output;
  }



};

window.isMobile = function() {
  let check = false;
  (function(a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
};
window.isMobileOrTablet = function() {
  let check = false;
  (function(a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
};

window.removeCollectionRecord = function(collection, criteriaFn) {
  // Use Array.findIndex to find the index of the element that satisfies the criteria
  const indexToRemove = collection.findIndex(criteriaFn);

  // Check if an element with the specified criteria was found
  if (indexToRemove !== -1) {
    // Use Array.splice to remove the element from the collection
    collection.splice(indexToRemove, 1);
  }

  // Return the modified collection
  return collection;
}

window.location.queryString = function(name) {
  var url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
String.prototype.maxLength = function(len) {
  if (this.length > len) {
    return this.slice(0, len) + " ...";
  } else {
    return this;
  }
};
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

if (!Array.prototype.some) { Array.prototype.some = function(fun, thisArg) { 'use strict'; if (this == null) { throw new TypeError('Array.prototype.some called on null or undefined'); } if (typeof fun !== 'function') { throw new TypeError(); } var t = Object(this); var len = t.length >>> 0; for (var i = 0; i < len; i++) { if (i in t && fun.call(thisArg, t[i], i, t)) { return true; } } return false; }; }

if (!Array.prototype.mode) {
  Array.prototype.mode = function() {
    var that = this; return this.sort((a, b) =>
      that.filter(v => v === a).length
      - that.filter(v => v === b).length
    ).pop();
  };
}

if (!Object.assign) {
  Object.assign = function(target, src) {
    Object.keys(src).forEach(function(srcKey) {
      target[srcKey] = src[srcKey];
    });
  }
}

if (!Object.nest) {
Object.nest = function(jsonInput){
  const result = {};

  for (const key in jsonInput) {
    if (jsonInput.hasOwnProperty(key)) {
      const keys = key.split('.');
      let currentObj = result;

      for (let i = 0; i < keys.length; i++) {
        const currentKey = keys[i];
        if (!currentObj[currentKey]) {
          if (i === keys.length - 1) {
            currentObj[currentKey] = jsonInput[key];
          } else {
            currentObj[currentKey] = {};
          }
        }
        currentObj = currentObj[currentKey];
      }
    }
  }

  return result;
}
}

String.prototype.fuzzy = function(term, ratio) {
    var string = this.toLowerCase();
    var compare = term.toLowerCase();
    var matches = 0;
    if (string.indexOf(compare) > -1) return true; // covers basic partial matches
    for (var i = 0; i < compare.length; i++) {
        string.indexOf(compare[i]) > -1 ? matches += 1 : matches -=1;
    }
    return (matches/this.length >= ratio || term == "")
};

String.prototype.toPhone = function(format) {
  
  let numbers=this.replace(/[^0-9]/ig,"");
  if(numbers.length===10){
    switch(format){
      case "formal":
      return "("+numbers.substr(0,3)+") "+numbers.substr(3,3)+"-"+numbers.substr(6);
      break;
      default:
        return numbers.substr(0,3)+"."+numbers.substr(3,3)+"."+numbers.substr(6);
      break;
    }
  }else{
    return this;
  }

  
};