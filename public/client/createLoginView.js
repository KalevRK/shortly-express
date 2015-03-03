Shortly.createLoginView = Backbone.View.extend({
  className: 'creator',

  template: Templates['login'],

  render: function() {
    // console.log(this.template());
    this.$el.html( this.template() );
    return this;
  }
});
