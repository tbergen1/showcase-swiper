/**
 * Defined Global App Variable
 */

if (!window.App) window.App = App = {
    criteria: {
        query: {},
        sort: {},
        page: 1
    },
    timer: {
        timeout: null
    },
    swipe: {
        oldIndex: 0,
        swipeCount: 0,
        recordsEnd: 1
    }
};


/**
 * Init Servant SDK & App
 */

$(document).ready(function() {

    // Initialize SDK
    Servant.initialize({
        application_client_id: 'LDGZDSdA2tDyUGKD'
    });

    // If access tokens in the current url, save & remove them
    App.access_tokens = Servant.fetchAccessTokens();

    // If app has access tokens start the dashboard view, else intialize the home page view
    if (App.access_tokens) return App._initializeDashboard();
    else return App._initializeHomePage();

});


/**
 * Initialize Home Page
 * - Shown when a user hasn't connected yet
 * - Start home page animations and more here
 */

App._initializeHomePage = function() {

    // Show connect button
    $('#connect-button-container').show();
};

/**
 * Initialize Dashboard
 * - Shown when a user has connected and the app has the user's access tokens
 * - Show a dashboard view that lets the user do something with the data on their servants
 * - This simple example shows one of their products on each servant
 */

App._initializeDashboard = function() {

    // Change greeting to "loading" while we fetch some data from Servant
    $('#greeting').text('Loading...');

    // Load user & their servants
    Servant.getUserAndServants(App.access_tokens.access_token, function(error, response) {

        // If error, stop everything and log it
        if (error) return console.log(error);

        // If user has no servants in their Servant account, stop everything and alert them.
        if (!response.servants.length) return alert('You must have at least one servant with data on it to use this application');

        // Save data to global app variable
        App.user = response.user;
        App.servants = response.servants;

        // Show the select field, allowing people to change servant.
        $('#servant-select-container').show();

        // Populate the Servant Select field with each Servant
        for (i = 0; i < App.servants.length; i++) {
            $('#servant-select').append('<option value="' + App.servants[i]._id + '">' + App.servants[i].master + '</option>');
        };

        // Set listener on the select field to change servant in application and reload products
        $('#servant-select').change(function() {
            App.criteria.query = {};
            return App._initializeServant($("#servant-select option:selected").val());
        });

        //Show category input field, allowing people to search for products with a specific category tag
        $('#category-select-container, #search-select-container').show();

        //Listen for key-up event in search field
        $('[name=category]').keyup(function() {

            if (App.timer.timeout !== null) clearTimeout(App.timer.timeout);

            App.timer.timeout = setTimeout(function() {
                App._search($('[name=category]').val())
            }, 1000);
        });

        //Change slide position based on search result selection
        $("#search-select").change(function(){
            App.slider.slick('slickGoTo', $("#search-select option:selected").val());
        });

        // Show products container
        $('#products-container').show();

        // Init Slick.js
        App.slider = $('#products-container');
        App.slider.slick();

        //Monitor swipe position and add products
        App.slider.on('afterChange', function(event, slick, currentSlide) {
            App._extendProducts(slick, currentSlide);
        });

        // Pick first Servant as default and initialize
        return App._initializeServant(App.servants[0]._id);
    });
};



/**
 * Initialize Servant
 * - Changes the default servant in the app
 * - Clears the view
 * - Reloads products from the new servant and renders one
 */

App._initializeServant = function(servantID) {
    // Change greeting to "loading" while we change servants
    $('#greeting').text('Loading...');

    // Find servant with this ID and set it as the App's default servant
    for (i = 0; i < App.servants.length; i++) {
        if (App.servants[i]._id === servantID) App.servant = App.servants[i];
    }

    // Clear products from screen, we're going to reload them from the new servant...
    App.slider.slick('slickRemove', null, null, true);

    // Set query criteria page back to 1
    App.criteria.page = 1;

    // Reload products
    App._loadProducts(function() {

        // Do something depending on whether the new servant holds any product records
        if (!App.products.length) {
            $('#greeting').text('Whoops, you have no products on this Servant.  Go make some in the Servant dashboard!');
        } else {
            $('#greeting').text('Here is a simple example of showing a product on this servant...');

            // Render multiple products
            for (i = 0; i < App.products.length; i++) {
                App._renderProduct(App.products[i]);
            }
            
        }
    }); 
};




/**
 * Load Products
 * - Loads Products from the App's default Servant
 * - Uses the App's default criteria settings
 * - Can easily be hooked up to a scroll listener to make infinite scrolling
 */

App._loadProducts = function(callback) {

    // Fetch products
    Servant.queryArchetypes(App.access_tokens.access_token, App.servant._id, 'product', App.criteria, function(error, response) {

        // If error, stop everything and log it
        if (error) return console.log(error);

        // Save data to global app variable
        App.products = response.records;
        App.totalProducts = response.meta.count;
        console.log(response);
        // Increment page number in our query criteria.  Next time we call the function, the next page will be fetched.
        App.criteria.page++;

        // Callback
        if (callback) return callback();

    });
};

/**
 * Render Contact
 * - Renders some html showing a single contact
 */

App._renderProduct = function(product) {

    // Create a string of the contact's html
    var html = '<div class="product">';
    if (product.images.length) html = html + '<img class="image" src="' + product.images[0].resolution_medium + '">';
    html = html + '<p class="name">' + product.name + '</p>';
    html = html + '<p class="price">$' + product.price/100 + '</p>';
    html = html + '</div>';

    // Append to products inside of slider
    App.slider.slick('slickAdd', html);

};

/**
* Add More Products
* - Determines distance from end of carousel and adds more products
*/

App._extendProducts = function(slick, currentSlide) {
        
        var detectThreshold = slick.slideCount - slick.currentSlide;
        var slideDirection = slick.currentSlide - App.swipe.oldIndex;
        var numPages = Math.ceil(App.totalProducts/10);
        
        //Determine swipe direction and record position relative to origin
        if (slideDirection > 0) App.swipe.swipeCount++;
        else if (slideDirection < 0) App.swipe.swipeCount--;

        //Reset position relative to origin if origin is visited
        if (slick.currentSlide === 0) App.swipe.swipeCount = 0;        
        
        //Stop additional product requests when page limit exceeded
        if (App.swipe.recordsEnd > numPages-1) return false;

        //Render next page of products if criteria met
        if (detectThreshold === 3 && slideDirection > 0 && App.swipe.swipeCount === slick.slideCount - 3)  App._loadProducts(function(){

            App.swipe.oldIndex = slick.currentSlide;
            App.swipe.recordsEnd++;

            for (i = 0; i < App.products.length; i++) {
                App._renderProduct(App.products[i]);
            }

        });

        else App.swipe.oldIndex = slick.currentSlide;
};

App._search = function(searchParam) {
  
    App.criteria.query.$text = {$search: searchParam}; 
    
    // Clear products from screen, we're going to reload them from the new servant...
    App.slider.slick('slickRemove', null, null, true);
    
    // Set query criteria page back to 1
    App.criteria.page = 1;

    App._loadProducts(function(){
        for (i = 0; i < App.products.length; i++) {
            $('#search-select').append('<option value="' + i + '">' + App.products[i].name + '</option>');
            $('#search-results').append('<li id="result' + i + '">' + App.products[i].name + '</li>');
            App._renderProduct(App.products[i]);
        } 
    });
};

// End


/*$( "#target" ).keyup(function() {
 
         // Show searching text to let user know searching is     happening automatically when they type

         if (search_timer) clearTimeout(search_timer);

         var search_timer = setTimeout(function() {
                // Execute search in here
               }, 500);


       });*/

