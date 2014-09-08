Dane = new Meteor.Collection('dane');

Router.map(function() {
    this.route('validate', {
        path: '/dane/:_id',
        waitOn: function() {
            return Meteor.subscribe('dane', this.params._id);
        },
        data: function() {
            return Dane.findOne(this.params._id);
        },
        onAfterAction: function() {
            Dane.update(this.params._id, {
                $set: {visited: true}
            });
        }
    });
    this.route('thanks', {
        path:'/thanks'
    });
    this.route('check', {
        path: '/output.json',
        where: 'server',
        action: function() {
            this.response.writeHead(200, {'Content-Type': 'text/javascript'});
            this.response.end(JSON.stringify(Dane.find().fetch(), null, 2));
        }
    });
});


if (Meteor.isClient) {
    Template.validate.helpers({
        json: function(it) {
            return JSON.stringify(it);
        }
    });
    Template.validate.events({
        'submit form':function(e){
            e.preventDefault();
            var result = $(e.target).serializeArray().reduce(function(a,b){
                a[b.name] = b.value;
                return a;
            },{});
            result.updated = new Date();
            Dane.update(this._id, result);
            Router.go('thanks');
        }
    });
}
if (Meteor.isServer) {
    Meteor.startup(function() {
        if (Dane.find().count() === 0) {
            Assets.getText('input.csv').split('\n').filter(function(it, idx) {
                return idx !== 0;
            }).map(function(line) {
                var row = line.split(',');
                return {
                    dziecko: row[1],
                    email1: row[2],
                    email2: row[3],
                    tel1: row[4],
                    tel2: row[5]
                };
            }).forEach(function(it) {
                Dane.insert(it);
            });
        }
    });
}
