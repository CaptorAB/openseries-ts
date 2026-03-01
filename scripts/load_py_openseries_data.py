"""Module to create metrics from the openseries Python package."""

from requests import get as requests_get
from pathlib import Path
from openseries import OpenTimeSeries, OpenFrame

# Column indices: Captor Iris Bond = 0 (first), Benchmark index = -1 (last)
IRIS_COL, BMK_COL = 0, -1

if __name__ == "__main__":
    base_url = "https://api.captor.se/public/api/opentimeseries/{}"
    iris_tid = "5b72a10c23d27735104e0576"
    hmsatr_tid = "63892890473ba6918f4ee954"
    iris_label = "Captor Iris Bond"
    bmk_label = "Benchmark index"

    resp_iris = requests_get(url=base_url.format(iris_tid), timeout=10)
    resp_hmsatr = requests_get(url=base_url.format(hmsatr_tid), timeout=10)
    resp_iris.raise_for_status()
    resp_hmsatr.raise_for_status()
    idata = resp_iris.json()
    bdata = resp_hmsatr.json()

    iris_series = OpenTimeSeries.from_arrays(
        name=iris_label,
        dates=idata["dates"],
        values=idata["values"],
        timeseries_id=iris_tid,
    )
    bmk_series = OpenTimeSeries.from_arrays(
        name=bmk_label,
        dates=bdata["dates"],
        values=bdata["values"],
        timeseries_id=hmsatr_tid,
    )

    frame = (
        OpenFrame(constituents=[iris_series, bmk_series])
        .trunc_frame()
        .value_nan_handle()
        .to_cumret()
    )

    docs = Path.home() / "Documents"
    frame.to_json(what_output="values", filename=str(docs / "frame.json"))
    data = frame.all_properties()
    data.columns = data.columns.droplevel(level=1)

    # Use truncated Iris (same as frame.json) for yearfrac/periods - matches TS compare script
    truncated_iris = frame.constituents[IRIS_COL]
    data.loc["periods_in_a_year", iris_label] = truncated_iris.periods_in_a_year
    data.loc["yearfrac", iris_label] = truncated_iris.yearfrac

    # Append all comparison metrics (Iris vs Benchmark) to Captor Iris Bond column
    te_series = frame.tracking_error_func(base_column=BMK_COL)
    data.loc["tracking_error", iris_label] = te_series.iloc[IRIS_COL]

    ir_series = frame.info_ratio_func(base_column=BMK_COL)
    data.loc["info_ratio", iris_label] = ir_series.iloc[IRIS_COL]

    data.loc["beta", iris_label] = frame.beta(asset=IRIS_COL, market=BMK_COL)
    data.loc["jensen_alpha", iris_label] = frame.jensen_alpha(
        asset=IRIS_COL, market=BMK_COL
    )

    cap_up = frame.capture_ratio_func(ratio="up", base_column=BMK_COL)
    data.loc["capture_ratio_up", iris_label] = cap_up.iloc[IRIS_COL]
    cap_down = frame.capture_ratio_func(ratio="down", base_column=BMK_COL)
    data.loc["capture_ratio_down", iris_label] = cap_down.iloc[IRIS_COL]
    cap_both = frame.capture_ratio_func(ratio="both", base_column=BMK_COL)
    data.loc["capture_ratio_both", iris_label] = cap_both.iloc[IRIS_COL]
    data.loc["correlation", iris_label] = frame.correl_matrix.loc[iris_label, bmk_label]
    data.loc["OLS coefficient", iris_label] = frame.ord_least_squares_fit(y_column=IRIS_COL, x_column=BMK_COL)["coefficient"]

    data = data.drop(labels=["Kappa-3 ratio", "Omega ratio", "Max drawdown in cal yr"], errors="ignore")

    data_path = docs / "data.json"
    data.to_json(data_path, date_format="iso", indent=2)
