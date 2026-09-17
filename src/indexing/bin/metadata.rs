use std::{
    path::{Path, PathBuf},
    sync::LazyLock,
};

use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use json::{array, object, JsonValue};
use nom_exif::{EntryValue, ExifIter, ExifTag, MediaParser, MediaSource};
use regex::Regex;

static TIME_PARSER: LazyLock<Regex> = std::sync::LazyLock::new(|| {
    Regex::new(
        r"(?x)
        (?:[^0-9]|^)
        (?<year>[12]\d{3})
            (?<date_sep1>[\-._:]?)
        (?<month>0[1-9]|1[0-2])
            (?<date_sep2>[\-._:]?)
        (?<day>[0-2][0-9]|3[01])
        [^0-9]+
        
        (?<time>
            (?<hour>[012]\d)
                (?<time_sep1>[\-._:]?)
            (?<minute>[0-5]\d)
                (?<time_sep2>[\-._:]?)
            (?<second>[0-5]\d)
        )?",
    )
    .unwrap()
});

pub struct PathMetdata {
    pub name: Option<String>,
    pub extension: Option<String>,
    pub path: String,
    pub rel_path: String,
}

pub fn get_path_metadata(path: &PathBuf, base_path: &Path) -> PathMetdata {
    let name = match path.file_name() {
        None => None,
        Some(name) => match name.to_str() {
            None => None,
            Some(name) => Some(String::from(name)),
        },
    };
    let extension = match path.extension() {
        None => None,
        Some(ext) => match ext.to_ascii_lowercase().into_string() {
            Err(_) => None,
            Ok(ext) => Some(ext),
        },
    };
    let full_path = String::from(match path.to_str() {
        None => "",
        Some(path) => path,
    });
    let rel_path = String::from(match path.strip_prefix(base_path) {
        Err(_) => "",
        Ok(path) => match path.to_str() {
            None => "",
            Some(path) => path,
        },
    });

    return PathMetdata {
        name,
        extension,
        path: full_path,
        rel_path,
    };
}

pub fn extract_exif(path: &String) -> (Option<JsonValue>, Option<NaiveDateTime>) {
    let media_source = MediaSource::file_path(path).unwrap();
    if !media_source.has_exif() {
        eprintln!("file '{}' has no exif data.", path);
        return (None, None);
    } else {
        let mut exif_json = object! {};
        let mut parser = MediaParser::new();
        let iter: ExifIter = match parser.parse(media_source) {
            Ok(iter) => iter,
            Err(_) => {
                return (None, None);
            }
        };
        let mut timestamp = None;
        for entity in iter {
            if let (Some(tag), Ok(val)) = (entity.tag(), entity.get_result()) {
                let name = tag.to_string();
                match val {
                    EntryValue::Undefined(_) => {}
                    EntryValue::Text(text) => {
                        let text = text.trim();
                        if text.len() > 0 {
                            exif_json[name] = text.into();
                        }
                    }
                    EntryValue::IRational(rational) => {
                        exif_json[name] = array![rational.0, rational.1]
                    }
                    EntryValue::URational(rational) => {
                        exif_json[name] = array![rational.0, rational.1]
                    }
                    EntryValue::F32(f) => exif_json[name] = (*f).into(),
                    EntryValue::F64(f) => exif_json[name] = (*f).into(),
                    EntryValue::U8(u) => exif_json[name] = (*u).into(),
                    EntryValue::U16(u) => exif_json[name] = (*u).into(),
                    EntryValue::U32(u) => exif_json[name] = (*u).into(),
                    EntryValue::U64(u) => exif_json[name] = (*u).into(),
                    EntryValue::I8(i) => exif_json[name] = (*i).into(),
                    EntryValue::I16(i) => exif_json[name] = (*i).into(),
                    EntryValue::I32(i) => exif_json[name] = (*i).into(),
                    EntryValue::I64(i) => exif_json[name] = (*i).into(),
                    EntryValue::Time(t) => {
                        match tag {
                            ExifTag::CreateDate => timestamp = Some(t.naive_local()),
                            ExifTag::DateTimeOriginal | ExifTag::ModifyDate => {
                                if let None = timestamp {
                                    timestamp = Some(t.naive_local());
                                }
                            }
                            _ => {}
                        }
                        exif_json[name] = t
                            .naive_local()
                            .format("%Y-%m-%dT%H:%M:%S")
                            .to_string()
                            .into()
                    }
                    EntryValue::NaiveDateTime(t) => {
                        match tag {
                            ExifTag::CreateDate => timestamp = Some(*t),
                            ExifTag::DateTimeOriginal | ExifTag::ModifyDate => {
                                if let None = timestamp {
                                    timestamp = Some(*t);
                                }
                            }
                            _ => {}
                        }
                        exif_json[name] = t.format("%Y-%m-%dT%H:%M:%S").to_string().into()
                    }
                    _ => {
                        // TODO: Consider adding support for commonly used values:
                        // U16Array, URationalArray
                    }
                }
            }
        }

        (Some(exif_json), timestamp)
    }
}

pub fn extract_timestamp_from_filename(filename: &String) -> Option<NaiveDateTime> {
    let Some(captures) = TIME_PARSER.captures(&filename) else {
        return None;
    };

    if &captures["date_sep1"] != &captures["date_sep2"] {
        return None;
    }
    if let Some(_) = captures.name("time") {
        if &captures["time_sep1"] != &captures["time_sep2"] {
            return None;
        }
    }

    let date = {
        let (year, month, day) = (&captures["year"], &captures["month"], &captures["day"]);
        let (year, month, day) = (
            year.parse::<i32>().unwrap(),
            month.parse::<u32>().unwrap(),
            day.parse::<u32>().unwrap(),
        );
        if let Some(date) = NaiveDate::from_ymd_opt(year, month, day) {
            date
        } else {
            return None;
        }
    };

    let time = if let Some(_) = captures.name("time") {
        let (hour, minute, second) = (&captures["hour"], &captures["minute"], &captures["second"]);
        let (hour, minute, second) = (
            hour.parse::<u32>().unwrap(),
            minute.parse::<u32>().unwrap(),
            second.parse::<u32>().unwrap(),
        );
        NaiveTime::from_hms_opt(hour, minute, second)
    } else {
        None
    };
    let time = if let Some(time) = time {
        time
    } else {
        NaiveTime::from_num_seconds_from_midnight_opt(0, 0).unwrap()
    };

    Some(NaiveDateTime::new(date, time))
}
