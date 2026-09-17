use std::path::Path;

use anyhow::{Error as E, Result};
use candle_core::{Device, IndexOp, Tensor};
use candle_nn::{Linear, Module, VarBuilder};
use candle_transformers::models::distilbert::{Config, DistilBertModel, DTYPE};
use tokenizers::Tokenizer;

pub struct Model {
    model: DistilBertModel,
    dense: Linear,
    tokenizer: Tokenizer,
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

        let (model, dense, tokenizer) = load_model(device, files_root)?;
        Ok(Model {
            model,
            dense,
            tokenizer,
        })
    }

    pub fn calc_embedding(&mut self, sentence: &str) -> Result<Vec<f32>> {
        let tokenizer = self
            .tokenizer
            .with_padding(None)
            .with_truncation(None)
            .map_err(E::msg)?;
        let encoding = tokenizer.encode(sentence, true).map_err(E::msg)?;
        let tokens = encoding.get_ids().to_vec();
        let token_ids = Tensor::new(&tokens[..], &self.model.device)?.unsqueeze(0)?;
        let token_type_ids = token_ids.zeros_like()?;

        let outputs = self.model.forward(&token_ids, &token_type_ids)?;

        // Apply mean pooling. This corresponds to the "1_Pooling" configuration
        // of the model 'clip-ViT-B-32-multilingual-v1'.
        let outputs = {
            let (_, n_tokens, _) = outputs.dims3()?;
            (outputs.sum(1)? / (n_tokens as f64))?
        };
        let embedding_inputs = outputs.i(0)?.to_vec1::<f32>()?;

        let token_ids = Tensor::new(&embedding_inputs[..], &self.model.device)?.unsqueeze(0)?;

        let outputs = self.dense.forward(&token_ids)?;
        let embedding_outputs = outputs.i(0)?.to_vec1::<f32>()?;

        Ok(embedding_outputs)
    }
}

fn load_model(device: Device, base_path: &Path) -> Result<(DistilBertModel, Linear, Tokenizer)> {
    let (config_path, tokenizer_path, weights_path, dense_weights_path) = {
        let config_path = base_path.join(Path::new("config.json"));
        let tokenizer_path = base_path.join(Path::new("tokenizer.json"));
        let weights_path = base_path.join(Path::new("model.safetensors"));
        let dense_weights_path = base_path.join(Path::new("2_Dense/model.safetensors"));

        (
            config_path,
            tokenizer_path,
            weights_path,
            dense_weights_path,
        )
    };

    let config = std::fs::read_to_string(config_path)?;
    let config: Config = serde_json::from_str(&config)?;
    let tokenizer = Tokenizer::from_file(tokenizer_path).map_err(E::msg)?;

    let model_vb = unsafe { VarBuilder::from_mmaped_safetensors(&[weights_path], DTYPE, &device)? };
    let model = DistilBertModel::load(model_vb, &config)?;

    // The '2_Dense' module -- just load the weights, but use hard-coded
    // configuration such as input and output dimensions.
    let dense_vb = unsafe {
        VarBuilder::from_mmaped_safetensors(
            &[dense_weights_path],
            candle_core::DType::F32,
            &device,
        )?
    };
    let dense = load_dense_model(768, 512, dense_vb)?;

    Ok((model, dense, tokenizer))
}

fn load_dense_model(in_dim: usize, out_dim: usize, vb: candle_nn::VarBuilder) -> Result<Linear> {
    let init_ws = candle_nn::init::DEFAULT_KAIMING_NORMAL;
    // "linear.weight" is the name of the weights as announced in the file
    // "model.safetensors" in the "2_Dense" directory.
    let ws = vb.get_with_hints((out_dim, in_dim), "linear.weight", init_ws)?;
    Ok(Linear::new(ws, None))
}
