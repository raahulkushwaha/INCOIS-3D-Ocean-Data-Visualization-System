"""
INCOIS Extensible Data Adapters
Standard interface for plugging in new observation sensors (CTD, Moorings, Radars, BGC)
and external numerical models.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List
import pandas as pd
import numpy as np


class BaseDataAdapter(ABC):
    """Base interface for all observation and model data adapters."""

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_data(self, **kwargs) -> Any:
        pass


class NetCDFDataAdapter(BaseDataAdapter):
    """Adapter for gridded CF-compliant NetCDF model files."""

    def __init__(self, file_path: str):
        self.file_path = file_path

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "format": "NetCDF-4",
            "conventions": "CF-1.8",
            "status": "Ready",
        }

    def get_data(self, **kwargs):
        pass


class CSVInSituAdapter(BaseDataAdapter):
    """Adapter for parsing external CSV/ASCII observation datasets."""

    def __init__(self, csv_content: str):
        self.csv_content = csv_content

    def parse_profile(self) -> Dict[str, Any]:
        # Simple ASCII/CSV parser for depth, temperature, salinity columns
        lines = [line.strip() for line in self.csv_content.strip().split("\n") if line.strip()]
        if not lines:
            return {"error": "Empty CSV content"}

        header = [h.strip().lower() for h in lines[0].split(",")]
        records = []
        for line in lines[1:]:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) == len(header):
                records.append(dict(zip(header, parts)))

        return {
            "record_count": len(records),
            "columns": header,
            "sample_data": records[:10]
        }

    def get_metadata(self) -> Dict[str, Any]:
        return {"format": "Delimited CSV/ASCII"}

    def get_data(self, **kwargs) -> Any:
        return self.parse_profile()
