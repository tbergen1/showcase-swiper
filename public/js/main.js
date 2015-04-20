/**
 * Defined Global App Variable
 */

if (!window.App) window.App = App = {
    criteria: {
        query: {},
        sort: {},
        page: 1
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
    if (App.access_tokens) return App.initializeDashboard();
    else return App.initializeHomePage();

});


/**
 * Initialize Home Page
 * - Shown when a user hasn't connected yet
 * - Start home page animations and more here
 */

App.initializeHomePage = function() {
    // Show connect button
    $('#connect-button-container').show();
};

/**
 * Initialize Dashboard
 * - Shown when a user has connected and the app has the user's access tokens
 * - Show a dashboard view that lets the user do something with the data on their servants
 * - This simple example shows one of their products on each servant
 */

App.initializeDashboard = function() {

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
            return App.initializeServant($("#servant-select option:selected").val());
        });
        // Show products container
        $('#products-container').show();
        // Init Slick.js
        App.slider = $('#products-container');
        App.slider.slick();
        //Monitor swipe position and add products
        App.oldIndex = 0;
        App.swipeCount = 0;
        App.swipeListen();
        // Pick first Servant as default and initialize
        return App.initializeServant(App.servants[0]._id);
    });
};



/**
 * Initialize Servant
 * - Changes the default servant in the app
 * - Clears the view
 * - Reloads products from the new servant and renders one
 */

App.initializeServant = function(servantID) {
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
    App.loadProducts(function() {
        // Do something depending on whether the new servant holds any product records
        if (!App.products.length) {
            $('#greeting').text('Whoops, you have no products on this Servant.  Go make some in the Servant dashboard!');
        } else {
            $('#greeting').text('Here is a simple example of showing a product on this servant...');
            // Render multiple products
            for (i = 0; i < App.products.length; i++) {
                App.renderProduct(App.products[i]);
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

App.loadProducts = function(callback) {

    // Fetch products
    Servant.queryArchetypes(App.access_tokens.access_token, App.servant._id, 'product', App.criteria, function(error, response) {

        // If error, stop everything and log it
        if (error) return console.log(error);

        // Save data to global app variable
        App.products = response.records;
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

App.renderProduct = function(product) {

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

App.swipeListen = function() {

    //Monitor for slide change and add products based on scenario
    App.slider.on('afterChange', function(event, slick, currentSlide) {
        console.log(slick);
        
        var detectThreshold = slick.slideCount - slick.currentSlide;
        var slideDirection = slick.currentSlide - App.oldIndex;
        //Determine swipe direction and record position relative to origin
        if (slideDirection > 0) App.swipeCount++;
        else if (slideDirection < 0) App.swipeCount--;
        //Reset position relative to origin if origin is visited
        if (slick.currentSlide === 0) App.swipeCount = 0;        
        //Render next page of products if criteria met
        if (detectThreshold === 3 && slideDirection > 0 && App.swipeCount === slick.slideCount - 3)  App.loadProducts(function(){

            App.oldIndex = slick.currentSlide;

            for (i = 0; i < App.products.length; i++) {
                    App.renderProduct(App.products[i]);
            }

        });

        else App.oldIndex = slick.currentSlide;
    });
};

// End

