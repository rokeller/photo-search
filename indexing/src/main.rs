use std::{collections::HashSet, path::Path, time::Instant};

use anyhow::Result;
use candle_core::Device;
use clap::Parser;
use scan_dir::ScanDir;

mod embedding;

#[derive(Parser)]
struct Args {
    #[arg(short, long, help = "Path to the model to use")]
    model: String,

    #[arg(short, long, help = "Path to the directory containing photos")]
    photos: String,

    #[arg(
        short,
        long,
        help = "Base URL of the indexing server; defaults to http://localhost:8081"
    )]
    indexing_server: Option<String>,

    #[arg(
        short,
        long,
        help = "File extensions to include; defaults to jpg,jpeg,jpe"
    )]
    file_extensions: Option<Vec<String>>,
}

fn main() -> Result<()> {
    let args = Args::parse();

    let indexing_server = match args.indexing_server {
        Some(base_url) => base_url,
        None => String::from("http://localhost:8081"),
    };

    let file_extensions = match args.file_extensions {
        Some(extensions) => extensions,
        None => vec![
            String::from("jpg"),
            String::from("jpeg"),
            String::from("jpe"),
        ],
    };

    println!("Loading model from '{}' ...", args.model);
    let device = Device::Cpu;
    let model = embedding::Model::new(device, args.model.as_str())?;
    println!("Model successfully loaded.");

    println!("Indexing photos in '{}' ...", args.photos);
    let photos_path = Path::new(&args.photos);
    let now = Instant::now();
    index_photos(photos_path, file_extensions, &model, &indexing_server)?;
    println!("Indexing photos took {:?}", now.elapsed());

    Ok(())
}

fn index_photos(
    photos_path: &Path,
    file_extensions: Vec<String>,
    model: &embedding::Model,
    server_url: &String,
) -> Result<()> {
    let mut extensions = HashSet::new();
    for extension in file_extensions {
        extensions.insert(extension.to_lowercase());
    }
    let extensions = extensions;

    ScanDir::files()
        .skip_symlinks(false)
        .walk(photos_path, |files| {
            let mut batch = 0;
            let mut num_files = 0;
            let mut image_paths = vec![];

            for (entry, _) in files {
                let entry_path = entry.path();
                let ext = entry_path.extension();
                match ext {
                    None => continue,
                    Some(ext) => {
                        let ext = ext.to_os_string().into_string().unwrap();
                        let ext = ext.to_lowercase();
                        if !extensions.contains(&ext) {
                            continue;
                        }
                    }
                };

                num_files += 1;
                image_paths.push(entry.path().into_os_string().into_string().unwrap());

                if image_paths.len() >= 20 {
                    batch += 1;
                    process_batch(batch, &image_paths, model, server_url);
                    image_paths.clear();
                }
            }

            if image_paths.len() > 0 {
                batch += 1;
                process_batch(batch, &image_paths, model, server_url);
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

fn process_batch(batch: i32, images: &Vec<String>, model: &embedding::Model, server_url: &String) {
    println!(
        "Calculate embeddings for batch {} ({} file(s))...",
        batch,
        images.len()
    );

    let embeddings = match model.calc_embeddings(images) {
        Err(e) => {
            eprintln!("Failed to create embeddings: {}", e);
            return;
        }
        Ok(embeddings) => embeddings,
    };

    println!("TODO: upload {:?} to {}", embeddings, server_url);
}
