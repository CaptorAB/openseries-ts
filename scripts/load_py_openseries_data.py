"""Module to create metrics from the openseries Python package."""

from requests import get as requests_get
from pathlib import Path
from openseries import OpenTimeSeries

if __name__ == "__main__":
    tid = "5b72a10c23d27735104e0576"
    urliris = f"https://api.captor.se/public/api/opentimeseries/{tid}"
    resp_iris = requests_get(urliris, timeout=10)
    resp_iris.raise_for_status()
    idata = resp_iris.json()
    iris = OpenTimeSeries.from_arrays(
        name="Captor Iris Bond", 
        dates=idata["dates"], 
        values=idata["values"], 
        timeseries_id=tid
        )
    _ = iris.to_json(what_output="values", filename="iris.json")
    data = iris.all_properties()
    data.columns = data.columns.droplevel(level=1)
    data_path = Path.home() / "Documents" / "data.json"
    data.to_json(data_path, date_format="iso")
