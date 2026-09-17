use std::path::Path;

use anyhow::{Error as E, Result};
use candle_core::{DType, Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::clip;

pub struct Model {
    device: Device,
    model: clip::ClipModel,
    config: clip::ClipConfig,
}

impl Model {
    pub fn new(device: Device, base_path: &str) -> Result<Self> {
        let files_root = Path::new(base_path);
        if !files_root.exists() {
            return Err(E::msg(format!("The path '{}' does not exist.", base_path)));
        } else if !files_root.is_dir() {
            return Err(E::msg(format!(
                "The path '{}' is not a directory.",
                base_path
            )));
        }

        let (model, config) = load_model(&device, files_root)?;
        Ok(Model {
            device,
            model,
            config,
        })
    }

    pub fn calc_embeddings(&self, image_paths: &Vec<String>) -> Result<Vec<Vec<f32>>> {
        let mut images = vec![];
        for image_path in image_paths {
            match self.load_image(image_path) {
                Ok(tensor) => images.push(tensor),
                Err(e) => eprintln!("{}", e),
            };
        }

        let images = Tensor::stack(&images, 0)?;
        self.calc_embeddings_for_pixels(&images)
    }

    fn calc_embeddings_for_pixels(&self, pixel_values: &Tensor) -> Result<Vec<Vec<f32>>> {
        let embeddings = match self.model.get_image_features(&pixel_values) {
            Ok(embeddings) => embeddings,
            Err(e) => return Err(E::msg(format!("Failed to calculate embeddings: {}", e))),
        };
        let embeddings_outputs = embeddings.to_vec2::<f32>()?;

        Ok(embeddings_outputs)
    }

    fn load_image<P: AsRef<std::path::Path>>(&self, path: P) -> anyhow::Result<Tensor> {
        let img = match image::ImageReader::open(&path) {
            Ok(img) => img,
            Err(e) => {
                return Err(E::msg(format!(
                    "Failed to load image '{}': {}. Skipping.",
                    path.as_ref().to_str().unwrap(),
                    e
                )));
            }
        };

        let img = match img.decode() {
            Ok(img) => img,
            Err(e) => {
                return Err(E::msg(format!(
                    "Failed to decode image '{}': {}. Skipping.",
                    path.as_ref().to_str().unwrap(),
                    e
                )))
            }
        };

        // The model expects images of 224x224, so resize the image accordingly.
        let image_size = u32::try_from(self.config.image_size)?;
        let (height, width) = (image_size, image_size);
        let img = img.resize_to_fill(width, height, image::imageops::FilterType::Triangle);
        let img = img.to_rgb8();
        let img = img.into_raw();

        let (height, width) = (self.config.image_size, self.config.image_size);
        let img = Tensor::from_vec(img, (height, width, 3), &self.device)?
            .permute((2, 0, 1))?
            .to_dtype(DType::F32)?
            .affine(2. / 255., -1.)?;

        Ok(img)
    }
}

fn load_model(device: &Device, base_path: &Path) -> Result<(clip::ClipModel, clip::ClipConfig)> {
    let model_root = Path::new(base_path);
    let model_path = model_root.join(Path::new("model.safetensors"));

    let vb =
        unsafe { VarBuilder::from_mmaped_safetensors(&[model_path.clone()], DType::F32, &device)? };

    let config = clip::ClipConfig::vit_base_patch32();
    let model = clip::ClipModel::new(vb, &config)?;

    Ok((model, config))
}
