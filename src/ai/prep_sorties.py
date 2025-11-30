from typing import Optional
import pandas as pd
from dateutil import parser

SORTIES_REMOVE_TEXT_COLS = [
    "titre",
    "description",
    "photo",
    "createurId",
    "itineraire_description",
]

SORTIES_BOOL_COLS = ["option_camping", "camping"]


def _parse_datetime_safe(dt: Optional[str]):
    if pd.isna(dt):
        return None
    try:
        return parser.parse(str(dt))
    except Exception:
        return None


def prepare_sorties_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for col in SORTIES_REMOVE_TEXT_COLS:
        if col in df.columns:
            df = df.drop(columns=[col])

    if "difficulte" in df.columns:
        df["difficulte"] = df["difficulte"].fillna("INCONNUE").astype(str)
        dummies = pd.get_dummies(df["difficulte"], prefix="difficulte")
        df = pd.concat([df.drop(columns=["difficulte"]), dummies], axis=1)

    if "type" in df.columns:
        df["type"] = df["type"].fillna("UNKNOWN").astype(str)
        dummies = pd.get_dummies(df["type"], prefix="type")
        df = pd.concat([df.drop(columns=["type"]), dummies], axis=1)

    for col in SORTIES_BOOL_COLS:
        if col in df.columns:
            df[col] = df[col].astype(str).str.lower().isin(["true", "1", "yes"]).astype(int)

    for col in ["capacite", "distance", "duree_estimee",
                "depart_lat", "depart_lon", "arrivee_lat", "arrivee_lon"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    if "date" in df.columns:
        dt_parsed = df["date"].apply(_parse_datetime_safe)
        df["mois"] = dt_parsed.apply(lambda d: d.month if d is not None else 0)
        df["jour_semaine"] = dt_parsed.apply(lambda d: d.weekday() if d is not None else 0)
        df = df.drop(columns=["date"])

    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(0)

    return df
