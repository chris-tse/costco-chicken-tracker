# Chicken Tracking

The language used to record rotisserie chicken label observations and describe their
historical patterns.

## Language

**Sighting**:
A record of information read from a rotisserie chicken label.
_Avoid_: Submission, report, purchase

**Label time**:
The local calendar date and clock time printed on a rotisserie chicken's label, preserved
as written rather than treated as the time the sighting was recorded or as an unambiguous
instant. It has no timezone: a printed 2:00 PM is 2:00 PM regardless of where the
sighting is recorded.
_Avoid_: Observation time, purchase time, batch time

**Doneness**:
An optional visual assessment of a chicken recorded as light, medium, or dark.
_Avoid_: Rating, quality score

**Visit plan**:
A selected weekday and approximate time evaluated against historical sightings.
_Avoid_: Prediction, forecast

**Planner signal**:
A non-probabilistic description of how a visit plan compares with historically observed
times on the same weekday, supported by a distinct-date evidence count.
_Avoid_: Probability, likelihood score
