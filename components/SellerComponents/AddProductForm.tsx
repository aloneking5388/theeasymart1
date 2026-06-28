"use client";
import { get_category } from "@/store/Categoris/categorySlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import Image from "next/image";
import { BsImages } from "react-icons/bs";
import { IoCloseSharp } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import FormInput from "../DashboardComponents/FormInput";
import { addProduct, productMessageClear } from "@/store/products/productSlice";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

const AddProductForm = () => {
   const router = useRouter()
  const editor = useRef<any>(null);
  const [content, setContent] = useState<string>("");
  const dispatch = useAppDispatch();
  const { categorys } = useAppSelector((state) => state.category);
  const { successMessage, errorMessage, loader } = useAppSelector(
    (state) => state.product
  );
  const { userInfo } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(
      get_category({
        searchValue: "",
        parPage: 0,
        page: 0,
      })
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
          c.name.toLowerCase().indexOf(value.toLowerCase()) > -1
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
    console.log("its working");
    if (
      !state.name ||
      !state.price ||
      !category ||
      !content ||
      images.length === 0
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("name", state.name);
    formData.append("description", content);
    formData.append("price", state.price);
    formData.append("stock", state.stock);
    formData.append("category", category);
    formData.append("discount", state.discount);
    formData.append("shopName", userInfo?.shopInfo?.shopName || "");
    formData.append("brand", state.brand);
    images.forEach((img) => {
      formData.append("images", img);
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
      setCategory("");
      router.push("/seller/allproducts");
    }
  }, [errorMessage, successMessage]);
  return (
    <div>
      <form onSubmit={add}>
        <div className="flex flex-col mb-3 md:flex-row gap-4 w-full text-[#d0d2d6]">
          <div className="flex flex-col w-full gap-1">
            <FormInput
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
              className={`absolute top-[101%] bg-slate-800 w-full transition-all z-[9999] ${
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
              <div className="flex justify-start items-start flex-col max-h-[200px] overflow-x-scroll">
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

        <div className="flex flex-col mb-3 md:flex-row gap-4 w-full text-[#d0d2d6]">
          <div className="flex flex-col w-full gap-1">
            <FormInput
              label="Price"
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
          <JoditEditor
            ref={editor}
            value={content}
            tabIndex={1}
            onBlur={(newContent) => setContent(newContent)}
            onChange={(newContent) => {}}
            config={{
              readonly: false,
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
          />
        </div>
        <div className="grid lg:grid-cols-4 grid-cols-1 md:grid-cols-3 sm:grid-cols-2 sm:gap-4 md:gap-4 xs:gap-4 gap-3 w-full text-[#d0d2d6] mb-4">
          {imageShow.map((img, i) => (
            <div key={i} className="w-full h-[180px] relative">
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
            className="flex justify-center items-center flex-col h-[180px] cursor-pointer border border-dashed hover:border-indigo-500 w-full text-[#d0d2d6]"
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
        </div>
        <div className="flex">
          <Button
            disabled={loader ? true : false}
            className="bg-blue-500 w-[190px] hover:shadow-blue-500/20 hover:shadow-lg text-white rounded-md px-7 py-2 mb-3"
          >
            {loader ? <Loader2 className="animate-spin" /> : "Add product"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddProductForm;
