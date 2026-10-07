"use client";
import { get_category } from "@/store/Categoris/categorySlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { FetchedAffiliateProduct, AffiliateFetchFailure } from "@/types/product";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import Image from "next/image";
import { BsImages } from "react-icons/bs";
import { IoCloseSharp } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import FormInput from "../DashboardComponents/FormInput";
import {
  addProduct,
  clearAffiliateProduct,
  fetchAffiliateProduct,
  productMessageClear,
} from "@/store/products/productSlice";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

const AddProductForm = () => {
  const router = useRouter();
  const editor = useRef<any>(null);
  const [content, setContent] = useState<string>("");
  const dispatch = useAppDispatch();
  const { categorys } = useAppSelector((state) => state.category);
  const {
    successMessage,
    errorMessage,
    loader,
    affiliateLoader,
    affiliateProduct,
    affiliateError,
    affiliateFailure,
  } = useAppSelector((state) => state.product);
  const { userInfo } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(
      get_category({
        searchValue: "",
        parPage: 0,
        page: 0,
      }),
    );
  }, []);

  const [state, setState] = useState({
    name: "",
    description: "",
    discount: "",
    price: "",
    brand: "",
    stock: "",
  });

  const [productType, setProductType] = useState<"physical" | "affiliate">("physical");
  const [imported, setImported] = useState<FetchedAffiliateProduct | null>(null);
  const [fallback, setFallback] = useState<AffiliateFetchFailure | null>(null);
  const [manual, setManual] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const isAffiliate = productType === "affiliate";
  const [affiliateLink, setAffiliateLink] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [margin, setMargin] = useState("");
  const [affiliateImages, setAffiliateImages] = useState<string[]>([]);

  const fetchFromAffiliateLink = () => {
    if (affiliateLoader || loader) return;
    if (!affiliateLink.trim()) {
      toast.error("Please paste an affiliate product link.");
      return;
    }
    try {
      const url = new URL(affiliateLink.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch { toast.error("Please enter a valid product URL."); return; }
    setImported(null); setFallback(null); setManual(false);
    dispatch(fetchAffiliateProduct(affiliateLink.trim()));
  };

  const marginInputHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMargin(e.target.value);
  };

  const removeAffiliateImage = (i: number) => {
    setAffiliateImages(affiliateImages.filter((_, index) => index !== i));
  };

  useEffect(() => {
    if (affiliateProduct && isAffiliate && affiliateProduct.originalAffiliateUrl === affiliateLink.trim()) {
      setImported(affiliateProduct); setFallback(null); setManual(false);
      setState((prev) => ({
        ...prev,
        name: affiliateProduct.name,
        brand: affiliateProduct.brand || "",
        price: affiliateProduct.price === null ? "" : String(affiliateProduct.price),
      }));
      setContent(affiliateProduct.description);
      if (affiliateProduct.price !== null) {
        setCostPrice(String(affiliateProduct.price));
      }
      setAffiliateImages(affiliateProduct.images);
      toast.success("Product information imported. Review it and choose an EasyMart category.");
      dispatch(clearAffiliateProduct());
    }
  }, [affiliateProduct, isAffiliate, affiliateLink, dispatch]);

  useEffect(() => {
    if (affiliateError) {
      if (affiliateFailure?.originalAffiliateUrl === affiliateLink.trim() && affiliateFailure?.fallbackToken && affiliateFailure.code === "PRODUCT_FETCH_UNAVAILABLE") setFallback(affiliateFailure);
      else toast.error(affiliateFailure?.code === "PRODUCT_FETCH_TIMEOUT" ? "The request timed out. Please retry Fetch Product." : affiliateFailure?.code === "INVALID_AFFILIATE_URL" ? "This URL cannot be used for product import." : affiliateError);
      dispatch(clearAffiliateProduct());
    }
  }, [affiliateError, affiliateFailure, affiliateLink, dispatch]);

  useEffect(() => {
    if (isAffiliate) return;
    const cost = parseFloat(costPrice);
    const marginPercent = parseFloat(margin);
    if (!isNaN(cost) && !isNaN(marginPercent)) {
      const finalPrice = cost + (cost * marginPercent) / 100;
      setState((prev) => ({ ...prev, price: finalPrice.toFixed(2) }));
    } else if (!isNaN(cost) && margin === "") {
      setState((prev) => ({ ...prev, price: cost.toFixed(2) }));
    }
  }, [costPrice, margin, isAffiliate]);

  const inputHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setState({
      ...state,
      [name]: value,
    });
  };
  const [cateShow, setCateShow] = useState(false);
  const [category, setCategory] = useState("");
  const [allCategory, setAllCategory] = useState<{ name: string }[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const categorySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSearchValue(value);

    if (value) {
      let srcValue = allCategory.filter(
        (c: { name: string }) =>
          c.name.toLowerCase().indexOf(value.toLowerCase()) > -1,
      );
      setAllCategory(srcValue);
    } else {
      setAllCategory(categorys);
    }
  };
  const [images, setImages] = useState<File[]>([]);
  const [imageShow, setImageShow] = useState<string[]>([]);

  const imageHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const length = files?.length;

    if (files && (length ?? 0) > 0) {
      setImages([...images, ...Array.from(files)]);
      let imageUrls: string[] = [];

      for (let i = 0; i < length!; i++) {
        imageUrls.push(URL.createObjectURL(files[i]));
      }

      setImageShow([...imageShow, ...imageUrls]);
    }
  };

  const changeImage = (img: any, index: number) => {
    if (img) {
      let tempUrl = imageShow;
      let tempImages = images;

      tempImages[index] = img;
      tempUrl[index] = URL.createObjectURL(img);
      setImageShow([...tempUrl]);
      setImages([...tempImages]);
    }
  };

  const removeImage = (i: number) => {
    const filterImage = images.filter((img, index) => index !== i);
    const filterImageUrl = imageShow.filter((img, index) => index !== i);
    setImages(filterImage);
    setImageShow(filterImageUrl);
  };

  useEffect(() => {
    return () => {
      imageShow.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageShow]);

  useEffect(() => {
    setAllCategory(categorys);
  }, [categorys]);

  const add = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loader || affiliateLoader) return;
    if (isAffiliate && !(manual && fallback?.fallbackToken && fallback.originalAffiliateUrl === affiliateLink.trim()) && (!imported || imported.originalAffiliateUrl !== affiliateLink.trim())) { toast.error("Fetch this affiliate product before publishing."); return; }
    if (
      !state.name ||
      !state.price ||
      !category ||
      !content ||
      (images.length === 0 && affiliateImages.length === 0)
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (manual && (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(Number(state.price)) || Number(state.price) < 0)) { toast.error("Enter a valid merchant price and three-letter currency code."); return; }
    const formData = new FormData();
    formData.append("productType", productType);
    if (isAffiliate && imported) formData.append("importToken", imported.importToken);
    if (isAffiliate && manual && fallback) {
      formData.append("affiliateMode", "manual");
      formData.append("fallbackToken", fallback.fallbackToken!);
      formData.append("affiliateLink", fallback.originalAffiliateUrl!);
      formData.append("currency", currency);
    }
    formData.append("name", state.name);
    formData.append("description", content);
    formData.append("price", state.price);
    formData.append("stock", state.stock);
    formData.append("category", category);
    formData.append("discount", state.discount);
    formData.append("shopName", userInfo?.shopInfo?.shopName || "");
    formData.append("brand", state.brand);
    if (isAffiliate && imported) formData.append("affiliateLink", imported.originalAffiliateUrl);
    if (!isAffiliate && costPrice) formData.append("costPrice", costPrice);
    if (!isAffiliate && margin) formData.append("margin", margin);
    images.forEach((img) => {
      formData.append("images", img);
    });
    affiliateImages.forEach((url) => {
      formData.append("imageUrls", url);
    });

    dispatch(addProduct(formData));
  };

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
      dispatch(productMessageClear());
    }
    if (successMessage) {
      toast.success(successMessage);
      dispatch(productMessageClear());
      setState({
        name: "",
        description: "",
        discount: "",
        price: "",
        brand: "",
        stock: "",
      });
      setImageShow([]);
      setImages([]);
      setAffiliateImages([]);
      setAffiliateLink("");
      setImported(null);
      setCostPrice("");
      setMargin("");
      setCategory("");
      router.push("/seller/allproducts");
    }
  }, [errorMessage, successMessage]);
  return (
    <div>
      <form onSubmit={add}>
        <fieldset disabled={affiliateLoader || loader} className="mb-5 text-[#d0d2d6]">
          <legend className="mb-2 font-semibold">Product Type</legend>
          <div className="flex gap-5">
            {(["physical", "affiliate"] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="productType" checked={productType === type} onChange={() => {
                  setProductType(type); setImported(null); setFallback(null); setManual(false); dispatch(clearAffiliateProduct()); setAffiliateImages([]);
                  setAffiliateLink(""); setCostPrice(""); setMargin(""); setContent("");
                  setImages([]); setImageShow([]);
                  setState({ name: "", description: "", discount: "", price: "", brand: "", stock: "" });
                }} />
                {type === "physical" ? "Physical Product" : "Affiliate Product"}
              </label>
            ))}
          </div>
        </fieldset>
        {isAffiliate && <>
        <div className="flex flex-col mb-3 md:flex-row gap-4 w-full text-[#d0d2d6]">
          <div className="flex flex-col w-full gap-1">
            <Label htmlFor="affiliateLink">Affiliate Link</Label>
            <div className="flex gap-2">
              <Input
                id="affiliateLink"
                value={affiliateLink}
                disabled={affiliateLoader || loader || manual}
                onChange={(e) => { setAffiliateLink(e.target.value); setFallback(null); setManual(false); dispatch(clearAffiliateProduct()); setImported(null); setAffiliateImages([]); setContent(""); setState((prev) => ({ ...prev, name: "", brand: "", price: "" })); }}
                placeholder="Paste your original merchant affiliate link"
                className="px-4 py-2 focus:border-indigo-500 outline-none bg-[#283046] border border-slate-700 rounded-md text-[#d0d2d6]"
              />
              <Button
                type="button"
                disabled={affiliateLoader || loader || manual}
                onClick={fetchFromAffiliateLink}
                className="bg-indigo-500 hover:shadow-indigo-500/20 hover:shadow-lg text-white rounded-md px-5 whitespace-nowrap"
              >
                {affiliateLoader ? (
                  <><Loader2 className="animate-spin" /> Fetching product...</>
                ) : (
                  "Fetch Product"
                )}
              </Button>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-300 mb-4">The merchant handles payment and delivery. Automatic import depends on the metadata the website provides.</p>
        {fallback && !manual && <div role="status" className="mb-4 rounded-md border border-slate-600 bg-[#283046] p-4 text-slate-200">
          <p className="font-semibold">{fallback.provider === 'amazon' ? 'Amazon product detected' : 'Automatic product import unavailable'}</p>
          <p className="my-2">EasyMart couldn't automatically retrieve {fallback.provider === 'amazon' ? "this Amazon product's" : "this product's"} details. Your affiliate link has been preserved. You can enter the product information manually.</p>
          <Button type="button" disabled={loader || affiliateLoader} onClick={() => { setManual(true); setImported(null); setAffiliateImages([]); setImages([]); setImageShow([]); setContent(""); setState(prev => ({ ...prev, name: "", brand: "", price: "" })); }} className="bg-indigo-500">Enter Details Manually</Button>
        </div>}
        {manual && <div className="mb-4 text-slate-200">
          <p className="font-semibold">Manual Affiliate Product — affiliate link locked</p>
          <p className="text-sm my-2">These details are seller-supplied and are not merchant-verified. The merchant's actual price may change. Upload images you are authorized to use.</p>
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" value={currency} maxLength={3} onChange={event => setCurrency(event.target.value.toUpperCase())} placeholder="USD" />
          <Button type="button" disabled={loader || affiliateLoader} onClick={() => { setManual(false); setFallback(null); setImported(null); setContent(""); setAffiliateImages([]); setImages([]); setImageShow([]); setState(prev => ({ ...prev, name: "", brand: "", price: "" })); dispatch(clearAffiliateProduct()); }}>Change Affiliate Link / Start Again</Button>
        </div>}
        {imported && <p role="status" className="text-sm text-slate-300 mb-4">{!imported.description || imported.price === null || !imported.images.length || !imported.brand ? "Some merchant details are unavailable. Fill in missing required fields; imported fields are locked." : "Merchant details imported and locked."} Currency: {imported.currency || "Not provided"}.</p>}
        </>}
        <div className="flex flex-col mb-3 md:flex-row gap-4 w-full text-[#d0d2d6]">
          <div className="flex flex-col w-full gap-1">
            <FormInput
              readOnly={isAffiliate && !!imported?.name}
              label="Product Name"
              id="name"
              name="name"
              value={state.name}
              onChange={inputHandle}
              placeholder="Product Name"
            />
          </div>
          <div className="flex flex-col w-full gap-1">
            <FormInput
              readOnly={isAffiliate && !!imported?.brand}
              label="Product brand"
              id="brand"
              value={state.brand}
              name="brand"
              onChange={inputHandle}
              placeholder="Product Brand"
            />
          </div>
        </div>
        <div className="flex flex-col mb-3 md:flex-row gap-4 w-full text-[#d0d2d6]">
          <div className="flex flex-col w-full gap-1 relative">
            <FormInput
              readOnly
              onClick={() => setCateShow(!cateShow)}
              label="Category"
              type="select"
              id="category"
              name="category"
              value={category}
              onChange={inputHandle}
              placeholder="--Product Category--"
            />
            <div
              className={`absolute top-[101%] bg-slate-800 w-full transition-all z-9999 ${
                cateShow ? "scale-100" : "scale-0"
              }`}
            >
              <div className="w-full px-4 py-2 fixed">
                <Input
                  value={searchValue}
                  onChange={categorySearch}
                  className="px-3 py-1 w-full focus:border-indigo-500 outline-none bg-transparent border border-slate-700 rounded-md text-[#d0d2d6] overflow-hidden"
                  type="text"
                  placeholder="search"
                />
              </div>
              <div className="pt-14"></div>
              <div className="flex justify-start items-start flex-col max-h-50 overflow-x-scroll">
                {allCategory.map((c, i) => (
                  <span
                    key={i}
                    className={`px-4 py-2 hover:bg-indigo-500 hover:text-white hover:shadow-lg w-full cursor-pointer ${
                      category === c.name && "bg-indigo-500"
                    }`}
                    onClick={() => {
                      setCateShow(false);
                      setCategory(c.name);
                      setSearchValue("");
                      setAllCategory(categorys);
                    }}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col w-full gap-1">
            <FormInput
              disabled={isAffiliate}
              label="Stock"
              id="stock"
              value={state.stock}
              name="stock"
              onChange={inputHandle}
              type="number"
              min="0"
              placeholder="Product Stock"
            />
          </div>
        </div>

        {!isAffiliate && <div className="flex flex-col mb-3 md:flex-row gap-4 w-full text-[#d0d2d6]">
          <div className="flex flex-col w-full gap-1">
            <FormInput
              label="Cost Price"
              id="costPrice"
              value={costPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCostPrice(e.target.value)
              }
              type="number"
              min="0"
              placeholder="Fetched or manual cost price"
            />
          </div>
          <div className="flex flex-col w-full gap-1">
            <FormInput
              label="Margin (%)"
              id="margin"
              value={margin}
              onChange={marginInputHandle}
              type="number"
              min="0"
              placeholder="e.g. 20"
            />
          </div>
        </div>}

        <div className="flex flex-col mb-3 md:flex-row gap-4 w-full text-[#d0d2d6]">
          <div className="flex flex-col w-full gap-1">
            <FormInput
              readOnly={isAffiliate && imported?.price != null}
              label={isAffiliate ? "Merchant Price (informational)" : "Price"}
              id="price"
              name="price"
              value={state.price}
              onChange={inputHandle}
              type="number"
              placeholder="Product Price"
            />
          </div>
          <div className="flex flex-col w-full gap-1">
            <FormInput
              disabled={isAffiliate}
              label="Discount"
              id="discount"
              name="discount"
              value={state.discount}
              onChange={inputHandle}
              type="number"
              min="0"
              placeholder="%discount%"
            />
          </div>
        </div>
        <div className="flex flex-col w-full gap-1 text-[#d0d2d6] mb-5">
          <Label htmlFor="description">Description</Label>
          {isAffiliate ? <textarea id="description" value={content} readOnly={!!imported?.description} onChange={(event) => setContent(event.target.value)} className="w-full min-h-48 rounded-md bg-[#283046] border border-slate-700 px-4 py-3" placeholder="Description unavailable from merchant. Enter the missing description." /> : <JoditEditor
            ref={editor}
            value={content}
            tabIndex={1}
            onBlur={(newContent) => setContent(newContent)}
            onChange={(newContent) => {}}
            config={{
              readonly: isAffiliate && !!imported?.description,
              theme: "dark", // this helps with basic dark mode
              height: 300,
              style: {
                backgroundColor: "#283046",
                color: "#d0d2d6",
                border: "1px solid #334155",
                borderRadius: "5px",
                padding: "8px",
              },
            }}
          />}
        </div>
        {(!isAffiliate || !imported?.images.length) && <div className="grid lg:grid-cols-4 grid-cols-1 md:grid-cols-3 sm:grid-cols-2 sm:gap-4 md:gap-4 xs:gap-4 gap-3 w-full text-[#d0d2d6] mb-4">
          {imageShow.map((img, i) => (
            <div key={i} className="w-full h-45 relative">
              <Label htmlFor={String(i)}>
                <Image
                  className="object-cover rounded-sm"
                  src={img}
                  fill
                  alt={`product image${i}`}
                />
              </Label>
              <Input
                onChange={(e) => changeImage(e.target.files![0], i)}
                type="file"
                id={String(i)}
                hidden
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="p-2 z-10 cursor-pointer bg-slate-700 hover:shadow-lg hover:shadow-slate-400/50 text-white absolute top-1 right-1 rounded-full"
              >
                <IoCloseSharp />
              </button>
            </div>
          ))}
          <Label
            className="flex justify-center items-center flex-col h-45 cursor-pointer border border-dashed hover:border-indigo-500 w-full text-[#d0d2d6]"
            htmlFor="image"
          >
            <span>
              <BsImages />
            </span>
            <span>select image</span>
          </Label>
          <Input
            multiple
            onChange={imageHandle}
            className="hidden"
            type="file"
            id="image"
          />
        </div>}
        {affiliateImages.length > 0 && (
          <div className="mb-4">
            <Label>Images fetched from affiliate link</Label>
            <div className="grid lg:grid-cols-4 grid-cols-1 md:grid-cols-3 sm:grid-cols-2 sm:gap-4 md:gap-4 xs:gap-4 gap-3 w-full text-[#d0d2d6] mt-2">
              {affiliateImages.map((img, i) => (
                <div key={i} className="w-full h-45 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="object-cover rounded-sm w-full h-full"
                    src={img}
                    alt={`affiliate image${i}`}
                  />
                  <button
                    type="button"
                    disabled={isAffiliate}
                    onClick={() => removeAffiliateImage(i)}
                    className="p-2 z-10 cursor-pointer bg-slate-700 hover:shadow-lg hover:shadow-slate-400/50 text-white absolute top-1 right-1 rounded-full"
                  >
                    <IoCloseSharp />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex">
          <Button
            disabled={loader || affiliateLoader || (isAffiliate && !imported && !manual)}
            className="bg-blue-500 w-47.5 hover:shadow-blue-500/20 hover:shadow-lg text-white rounded-md px-7 py-2 mb-3"
          >
            {loader ? <Loader2 className="animate-spin" /> : isAffiliate ? "Publish Affiliate Product" : "Add product"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddProductForm;
