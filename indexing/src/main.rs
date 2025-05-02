use std::{collections::HashSet, iter::zip, path::Path, time::Instant};

use anyhow::Result;
use candle_core::Device;
use clap::Parser;
use json::{object, JsonValue};
use metadata::{extract_exif, extract_timestamp_from_filename, get_path_metadata};
use scan_dir::ScanDir;
use serde::Deserialize;

mod embedding;
mod metadata;

#[derive(Parser)]
struct Args {
    #[arg(short, long, help = "Path to the model to use")]
    model: String,

    #[arg(short, long, help = "Path to the directory containing photos")]
    photos: String,

    #[arg(
        short,
        long,
        help = "Base URL of the indexing server",
        default_value = "http://localhost:8081"
    )]
    indexing_server: String,

    #[arg(
        short,
        long,
        help = "File extensions to include",
        default_values = vec!["jpg","jpeg","jpe"],
    )]
    file_extensions: Vec<String>,

    #[arg(
        short,
        long,
        help = "Size of a single batch of images to calculate embeddings for",
        default_value = "20"
    )]
    batch_size: usize,
}

#[derive(Deserialize)]
struct GetIndexResponse {
    values: Vec<String>,
    next_offset: Option<String>,
}

fn main() -> Result<()> {
    let args = Args::parse();

    println!("Loading model from '{}' ...", args.model);
    let device = Device::Cpu;
    let model = embedding::Model::new(device, args.model.as_str())?;
    println!("Model successfully loaded.");

    let photos_path = Path::new(&args.photos);
    let now = Instant::now();

    let file_extensions = args.file_extensions;
    let indexing_server = args.indexing_server;
    println!(
        "Indexing photos in '{}' to '{}' ...",
        args.photos, indexing_server
    );
    index_photos(
        photos_path,
        file_extensions,
        &model,
        &indexing_server,
        args.batch_size,
    )?;
    println!("Indexing photos took {:?}", now.elapsed());

    Ok(())
}

fn index_photos(
    photos_path: &Path,
    file_extensions: Vec<String>,
    model: &embedding::Model,
    server_url: &String,
    batch_size: usize,
) -> Result<()> {
    let mut extensions = HashSet::new();
    for extension in file_extensions {
        extensions.insert(extension.to_lowercase());
    }
    let extensions = extensions;

    let cur_index = fetch_current_index(server_url)?;
    println!("Found {} photos in current index.", cur_index.len());

    ScanDir::files()
        .skip_symlinks(false)
        .walk(photos_path, |files| {
            let mut batch = 0;
            let mut num_files = 0;
            let mut batch_data = vec![];

            for (entry, _) in files {
                let entry_path = entry.path();
                let path_meta = get_path_metadata(&entry_path, &photos_path);

                if path_meta.name.is_none()
                    || path_meta.extension.is_none()
                    || cur_index.contains(&path_meta.rel_path)
                {
                    // The file does not have a name or extension or it is
                    // already indexed, skip it.
                    continue;
                }

                let ext = path_meta.extension.clone().unwrap();
                if !extensions.contains(&ext) {
                    // The file extension should not be included in indexing, skip it.
                    continue;
                }

                let mut meta = object! {
                    path : path_meta.rel_path.clone(),
                };
                let (exif, timestamp) = extract_exif(&path_meta.path);
                if let Some(exif) = exif {
                    meta["exif"] = exif;
                }

                let file_name = path_meta.name.clone().unwrap();
                let timestamp = if let Some(timestamp) = timestamp {
                    Some(timestamp)
                } else if let Some(timestamp) = extract_timestamp_from_filename(&file_name) {
                    Some(timestamp)
                } else {
                    None
                };
                if let Some(timestamp) = timestamp {
                    meta["timestamp"] = timestamp.and_utc().timestamp().into();
                }

                println!("Adding {} ...", path_meta.rel_path);
                num_files += 1;
                batch_data.push((path_meta.path, meta));

                if batch_data.len() >= batch_size {
                    batch += 1;
                    process_batch(batch, batch_data, model, server_url);
                    batch_data = vec![];
                }
            }

            if batch_data.len() > 0 {
                batch += 1;
                process_batch(batch, batch_data, model, server_url);
            }

            println!(
                "Indexed {} files from {}.",
                num_files,
                photos_path.display()
            );
        })
        .unwrap();

    Ok(())
}

fn fetch_current_index(server_url: &String) -> Result<HashSet<String>> {
    let index_url = format!("{}/v1/index", server_url);
    let client = reqwest::blocking::ClientBuilder::new().build()?;
    let resp = client
        .get(&index_url)
        .query(&[("size", "1000")])
        .send()?
        .error_for_status()?;
    let mut paths = HashSet::new();

    let mut json = resp.json::<GetIndexResponse>()?;
    loop {
        for path in json.values {
            paths.insert(path);
        }

        if let Some(ref next_offset) = json.next_offset {
            let resp = client
                .get(&index_url)
                .query(&[("size", "1000"), ("offset", &next_offset.as_str())])
                .send()?
                .error_for_status()?;
            json = resp.json::<GetIndexResponse>()?;
        } else {
            break;
        }
    }

    Ok(paths)
}

fn process_batch(
    batch_no: i32,
    items: Vec<(String, JsonValue)>,
    model: &embedding::Model,
    server_url: &String,
) {
    println!(
        "Calculate embeddings for batch {} ({} file(s))...",
        batch_no,
        items.len()
    );

    let (full_paths, payloads): (Vec<_>, Vec<_>) = items
        .iter()
        .map(|item| (item.0.to_owned(), item.1.to_owned()))
        .unzip();
    let embeddings = match model.calc_embeddings(&full_paths) {
        Err(e) => {
            eprintln!("Failed to create embeddings: {}", e);
            return;
        }
        Ok(embeddings) => embeddings,
    };

    let vectors_with_payloads: Vec<_> = zip(embeddings, payloads)
        .map(|item| {
            object! {
                v: item.0,
                p: item.1,
            }
        })
        .collect();

    match upload_embeddings(server_url, vectors_with_payloads) {
        Err(e) => eprintln!("Error uploading batch: {}", e),
        _ => {}
    }
}

fn upload_embeddings(server_url: &String, items: Vec<JsonValue>) -> Result<()> {
    let index_url = format!("{}/v1/index", server_url);
    let client = reqwest::blocking::ClientBuilder::new().build()?;

    let request = object! {
        items: items,
    };
    println!("Uploading batch to internal server ...");
    client
        .post(&index_url)
        .body(request.dump())
        .header("content-type", "application/json")
        .send()?
        .error_for_status()?;

    Ok(())
}
