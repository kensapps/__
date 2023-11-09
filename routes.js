__.config.base_api_url = "";
__.config.object_storage_url = "";
__.config.use_min="";

if(window.location.host==="127.0.0.1:5500"){
  __.config.base_api_url = "http://127.0.0.1:8080";  
  __.config.use_min="";
}else if(window.location.host.indexOf("something.com")>0){
  __.config.base_api_url = "";  
  __.config.use_min="";
}

__.routes = [

  

  // DEFAULT CATCH ALL 
  [".*", (p) => {
    __.renderLayout("auth", function() {
      document.getElementById("authHead").innerHTML = Handlebars.compile(__.models.orgs.data.ui.templates.portal.head)();
      __.renderScreen("auth/login", p);
    })

  }]
];


$(document).ready(function() {
  __.ui.loading.body();
  __.load([], function() {

      __.router(true, 0, () => {
        __.ui.loading.body(true);
      });
      
    });

});