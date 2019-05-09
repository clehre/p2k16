# Getting started

Install:

- virtualenv
- bower

Creating the database:

    # sudo -u postgres psql -f database-setup.sql

Running the application:

    # ./run-p2k16-web

This will fail unless you have the required applications installed.

## Note about Java
Running on Debian 10, the standard Java version is 11 which has a conflict with flyway 4.2.0. A work around is to update alternatives by running:
    # sudo update-java-alternatives -s java-1.8.0-openjdk-amd64

## Developing on Windows
Note that it's "almost" possible to install p2k16 and all the required code on Windows, but after about 1.5hrs of installing and jumping across obstacles, you'll end up at a dead end trying to make "fcntl.py" work. Just download Ubuntu on Windows to save you time?

## Developing on OSX
When setting up on OSX, you'll likely get the error:

    sudo: unknown user: postgres

To get around this, load the database file like this instead:

    sudo psql -U YourUserNameOnTheMachine postgres -f database-setup.sql 

# Creating SQL migrations

We use Flyway (https://flywaydb.org) to manage the schema. Flyway is a upgrade-only, sql-only tool (at least in our
setup) to manage SQL databases. We're smart and are using PostgreSQL which support transactional changes to the schema.

After checking out the code and creating the database, run `./flyway migrate` to migrate the database.

If you want to change the schema, create a new file under `migrations/` called `V001.NNN__clever_comment.sql`. If more
than one person is creating a schema at the same time you will get a conflict when the code is merged.

# TODOs (fix at any time)

* Add word completion to Add Badge text field.
* Empty text field after clicking Add badge on user profile.
* Show success message after adding badge on user profile.
* Fix duplicate-check for badge names.
* Add word cloud or similar for badges on Bitraf front page, to increase front page utility and engagement.
* Add delete badge-button for self-made badges.
* Limit line length for badges on user profile.
* Drop BIGSERIAL on _version tables. Should be BIGINT instead.
* Prevent updates to certain fields like Account.username.
  SQLAlchemy's event systems seems like a useful method: http://docs.sqlalchemy.org/en/latest/orm/events.html
* Tools: maintain state in case of reboot (using retained messages on mqtt-server)

# Badge system

## Motivation

 * Enforce users have necessary course for dangerous machines
 * Make holding courses more attractive
 * Easier to find who knows what. Show a list/word cloud of the competence of the people who has recently checked in at
   Bitraf. On the front page, perhaps show a list of *all* active people's competence.
 * Encourage people to be active members at Bitraf

## Examples

Badges is a way to tell something about a user. They have no monetary value, but can have a lot of social value.

Certain badges are restricted so that they can only be given to a person by someone else (aka karma badges), and other
badges are restricted so that only certain users can award them (for example course instructors).

Most badges can be awarded multiple times too.

Badge categories:

 * Competence levels (badges required to operate certain tools that require course)

   - laser cutter
   - CNC-operator
   - lathe

 * Skill areas: (for expressing hobbies and competence levels)

   - laser cutting
   - woodworking
   - metalworking
   - soldering
   - KiCAD, Eagle
   - SMT
   - PCB-etching
   - oscilloscope

 * Karma badges

   - Cleaner
   - Dugnader
   - Bitraf project fixer
   
 * Various badge ideas
    - Badge "Initiator"\"dugnadsånd"? Badge for fixing something at Bitraf, i.e repairing laser, workshop mentoring, implementing web solutions (like this badge thingie), etc.
    - Profession badge category, i.e Professional Programmer, Professional Electrician, Professional Carpenter.

# Maintaining and extending P2K16
Once you've set up your dev environment according to the Getting started instructions and you can run a local version of the server by executing ./run-p2k16-web you can start developing against http://localhost:5000. The P2K16 gui is built with [Flask](http://flask.pocoo.org) 

## Auto generated files
The .js files in /src/p2k16/web/static are all autogenerated by python code with matching names. door-data-service.js is generated by door_blueprint.py.

