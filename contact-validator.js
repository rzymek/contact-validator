Dane = new Meteor.Collection('dane');

function normalizeEmails(it) {
    return [it.email1, it.email2].map(function(email) {
        return email.trim();
    }).filter(function(email) {
        return email.length > 0;
    });
}
function all() {
    return Dane.find({},{sort:{dziecko:1}});
}
function fmtDate(date) {
    function fmt(c, s) {
        while (s.toString().length < c) {
            s = '0' + s;
        }
        return s;
    }
    if(!date)
        return '';
    return date.getFullYear() + "-" + fmt(2, date.getMonth() + 1) + "-" + fmt(2, date.getDate()) + " "
            + fmt(2, date.getHours()) + ":" + fmt(2, date.getMinutes());
};
Router.map(function() {
    this.route('root', {
        path:'/'
    });
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
                $set: {visited: new Date()}
            });
        },
        action: function() {
            if (this.ready())
                this.render();
            else
                this.render('loading');
        }
    });
    this.route('thanks', {
        path: '/thanks'
    });
    this.route('check', {
        path: '/get/:key.json',
        where: 'server',
        action: function() {
            if (this.params.key !== Assets.getText('key').trim()) {
                this.response.writeHead(403, {'Content-Type': 'text/plain'});
                this.response.end('Invalid key');
                return;
            }
            this.response.writeHead(200, {'Content-Type': 'text/javascript'});
            this.response.end(JSON.stringify(all().fetch(), null, 2));
        }
    });
    this.route('check', {
        path: '/get/:key.csv',
        where: 'server',
        action: function() {
            if (this.params.key !== Assets.getText('key').trim()) {
                this.response.writeHead(403, {'Content-Type': 'text/plain'});
                this.response.end('Invalid key');
                return;
            }
            this.response.writeHead(200, {'Content-Type': 'text/csv'});
            this.response.end(all().map(function(it,idx){
                return (idx+1)+','+it.dziecko+','+it.email1+','+
                        it.email2+','+it.tel1+','+it.tel2+','+
                        fmtDate(it.visited)+','+
                        fmtDate(it.updated);
            }).join('\n'));
        }
    });
    this.route('mail', {
        path: '/mail/:key',
        where: 'server',
        action: function() {
            if (this.params.key !== Assets.getText('key').trim()) {
                this.response.writeHead(403, {'Content-Type': 'text/plain'});
                this.response.end('Invalid key');
                return;
            }
            var resp = this.response;
            this.response.writeHead(200, {'Content-Type': 'text/plain'});
            Dane.find(
                    {email1:'rzymek+p1@gmail.com'}
            ).map(function(it) {
                it.to = normalizeEmails(it);
                return it;
            }).filter(function(it){
                return it.to.length > 0;
            }).forEach(function(it) {
                var text = 'Witam \n\
\n\
Z tej strony Krzysiek z rady rodziców z przedszkola 299. Zakładam listę dyskusyjną dla naszej grupy.\n\
Pod adresem https://grupa1.meteor.com/dane/' + it._id + ' można sprawdzić i poprawić\n\
maile i numery telefonów, które zbierałem na zebraniu.  Potwierdzone maile dodam do grupy.\n\
\n\
Pozdrawiam\n\
Krzysiek Rzymkowski\n\
\n\
PS. Jeżeli na stronie pojawi się komunikat "This site is down", to wystarczy odświerzyć strone (klawisz F5).';
                var email = {
                    from: 'rzymek+p1@gmail.com',
                    to: it.to,
                    subject: 'Lista mailowa grupy 1',
                    text: text
                };
                Email.send(email);
                resp.write(it.dziecko+'\n');
            });
            this.response.end('\nDone');
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
        'submit form': function(e) {
            e.preventDefault();
            var result = $(e.target).serializeArray().reduce(function(a, b) {
                a[b.name] = b.value;
                return a;
            }, {});
            result.updated = new Date();
            Dane.update(this._id, {
                $set: result
            });
            Router.go('thanks');
        }
    });
}
if (Meteor.isServer) {
    Meteor.startup(function() {
        if (Dane.find().count() === 0) {
            Assets.getText('input.csv').split('\n').filter(function(it, idx) {
                console.log(idx,it);
                return idx !== 0 && it.trim().length > 0;
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
                console.log(it);
                Dane.insert(it);
            });
        }
    });
    Meteor.publish('dane', function(id) {
        check(id, String);
        return Dane.find(id);
    });
    Dane.allow({
        update: function() {
            return true;
        }
    });
}
