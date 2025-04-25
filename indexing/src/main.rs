use std::path::Path;

use anyhow::Result;
use candle_core::Device;
use clap::Parser;

mod embedding;

#[derive(Parser)]
struct Args {
    #[arg(short, long, help = "Path to the model to use")]
    model_path: String,

    #[arg(short, long, help = "Path to the directory containing photos")]
    photos_path: String,
}

fn main() -> Result<()> {
    let args = Args::parse();

    println!("Loading model from '{}' ...", args.model_path);
    let device = Device::Cpu;
    let model = embedding::Model::new(device, args.model_path.as_str())?;
    println!("Model successfully loaded.");

    println!("Indexing photos in '{}' ...", args.photos_path);
    let photos_path = Path::new(&args.photos_path);
    let mut image_paths = vec![];
    let dir_contents = photos_path.read_dir();
    assert!(
        dir_contents.is_ok(),
        "The photos-path '{}' must exist!",
        args.photos_path
    );
    for entry in dir_contents.unwrap() {
        if let Ok(entry) = entry {
            let file_type = entry.file_type().expect("must be able to read file types");
            if file_type.is_file() {
                let path = entry.path().to_str().unwrap().to_string();
                image_paths.push(path);
            }
        }
    }

    println!("Calculating embeddings for {:?} ...", image_paths);
    let embeddings = model.calc_embeddings(&image_paths)?;
    println!("embeddings: {:?}", embeddings);

    Ok(())
}
