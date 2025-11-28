import pandas as pd
import numpy as np

PREF_ONE_HOT_COLS = [
    "level",
    "cyclingType",
    "cyclingFrequency",
    "cyclingDistance",
    "hikeType",
    "hikeDuration",
    "hikePreference",
    "campingType",
    "campingDuration",
]

PREF_BOOL_COLS = [
    "cyclingGroupInterest",
    "campingPractice",
]

PREF_DAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
]


def _parse_hour_to_float(h: str | None) -> float:
    if pd.isna(h):
        return np.nan
    try:
        parts = str(h).split(":")
        if len(parts) != 2:
            return np.nan
        hh = int(parts[0])
        mm = int(parts[1])
        return hh + mm / 60.0
    except Exception:
        return np.nan


def prepare_preferences_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    if "onboardingComplete" in df.columns:
        mask = df["onboardingComplete"].astype(str).str.lower().isin(["true", "1", "yes"])
        df = df[mask].reset_index(drop=True)

    for col in PREF_ONE_HOT_COLS:
        if col in df.columns:
            df[col] = df[col].fillna("UNKNOWN").astype(str)
            dummies = pd.get_dummies(df[col], prefix=col)
            df = pd.concat([df.drop(columns=[col]), dummies], axis=1)

    for col in PREF_BOOL_COLS:
        if col in df.columns:
            df[col] = df[col].astype(str).str.lower().isin(["true", "1", "yes"]).astype(int)

    if "availableDays" in df.columns:
        for j in PREF_DAYS:
            df[f"day_{j}"] = 0

        def _encode_days(val: str | None):
            if pd.isna(val):
                return set()
            return set(str(val).split("|"))

        all_days = df["availableDays"].apply(_encode_days)
        for idx, days in all_days.items():
            for j in PREF_DAYS:
                if j in days:
                    df.at[idx, f"day_{j}"] = 1
        df = df.drop(columns=["availableDays"])

    if "start" in df.columns:
        df["start_hour"] = df["start"].apply(_parse_hour_to_float)
        df = df.drop(columns=["start"])
    if "end" in df.columns:
        df["end_hour"] = df["end"].apply(_parse_hour_to_float)
        df = df.drop(columns=["end"])

    for col in ["latitude", "longitude", "averageSpeed"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(0)

    return df
