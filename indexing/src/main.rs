use std::path::Path;

use anyhow::{Ok, Result};
use candle_core::{DType, Device};
use candle_nn::VarBuilder;
use candle_transformers::models::clip;
use clap::Parser;

#[derive(Parser)]
struct Args {
    // #[arg(long)]
    // model: Option<String>,

    // #[arg(long)]
    // tokenizer: Option<String>,

    // #[arg(long, use_value_delimiter = true)]
    // images: Option<Vec<String>>,

    // #[arg(long)]
    // cpu: bool,

    // #[arg(long, use_value_delimiter = true)]
    // sequences: Option<Vec<String>>,
    #[arg(short, long, help = "Path to the model to use")]
    model_path: String,

    #[arg(short, long, help = "Path to the directory containing photos")]
    photos_path: String,
}
fn main() -> Result<()> {
    let args = Args::parse();

    println!("Loading model from '{}' ...", args.model_path);
    println!("Indexing photos in '{}' ...", args.photos_path);

    let device = Device::Cpu;
    let base_path = args.model_path.as_str();
    let model_root = Path::new(base_path);
    let model_path = model_root.join(Path::new("0_CLIPModel/model.safetensors"));

    let config = clip::ClipConfig::vit_base_patch32();

    let vb =
        unsafe { VarBuilder::from_mmaped_safetensors(&[model_path.clone()], DType::F32, &device)? };

    let model = clip::ClipModel::new(vb, &config)?;
    // huggingface fork: https://discuss.huggingface.co/t/how-to-fork-in-the-git-sense-a-model-repository/9663/6
    // https://github.com/huggingface/candle/blob/main/candle-examples/examples/clip/main.rs
    // model.forward(pixel_values, input_ids)
    //model.get_image_features(pixel_values)

    Ok(())
}

// fn load_model() {

// }
